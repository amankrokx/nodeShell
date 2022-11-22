// Path: nodeShell\shell.js
// Imports
const { exec } = require("child_process")
const fs = require("fs")
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Read from input in raw mode
readline.rawListeners("line")
// Variable to check for windows
let win32 = false
if (process.platform === "win32") {
    win32 = true
    // Windows workaround for ctrl + c
    readline.on("SIGINT", () => {
        process.emit("SIGINT")
    })
}

// Variable to store spawned childrens
let currentPid = null
let childrens = {}

// Function to print current ready line
function printReadyLine(pid) {
    if (!pid) process.stdout.write(`\x1b[36mnodeShell > \x1b[0m${process.cwd()} $ `)
    else process.stdout.write(`\x1b[36mnodeShell > \x1b[32m${pid || currentPid}\x1b[0m > `)
}

// Function to spawn child process
function spawnChildWithExec(input) {
    const child = exec(input)
    child.stdout.on("data", (data) => {
        if (currentPid === child.pid)
            process.stdout.write(data)
    })
    child.stderr.on("data", (data) => {
        if (currentPid === child.pid)
            process.stdout.write(data)
    })
    child.on("close", (code) => {
        if (currentPid === child.pid) {
            process.stdout.write(` Child process exited with code ${code}\n`)
            printReadyLine()
            currentPid = null
        }
        delete childrens[child.pid]
    })
    childrens[child.pid] = child
    currentPid = child.pid
}


printReadyLine()
readline.on("line", (input) => {
    if (currentPid) {
        childrens[currentPid].stdin.write(input)
        process.stdout.write("\x1b[36mnodeShell > \x1b[32m" + currentPid + "\x1b[0m > ")
        return
    }

    switch (input) {
        case "exit":
            for (const child of Object.values(childrens))
                if (!child.killed)
                    child.kill()
            process.stdout.write("\nExiting nodeShell...\n")
            process.exit()
        case "ls":
            fs.readdirSync(process.cwd()).forEach(file => {
                process.stdout.write(file + '\n')
            })
            break
        case "pwd":
            process.stdout.write(process.cwd())
            break
        default:
            if (input.startsWith("cd")) {
                const path = input.split(" ")[1]
                try {
                    process.chdir(path)
                } catch (err) {
                    process.stdout.write(err)
                }
            }
            else if (input.startsWith("fg")) {
                const pid = input.split(" ")[1]
                if (childrens[pid] && childrens[pid].killed === false) {
                    process.stdout.write(`Brought process ${pid} to foreground\n`)
                    currentPid = pid
                } else
                    process.stdout.write(`Process ${pid} died or doesn't exist\n`)
            } else 
                spawnChildWithExec(input)
            break
    }

    if (!currentPid)
        printReadyLine()
    else
        printReadyLine(currentPid)
})

process.on("SIGINT", () => {
    if (currentPid) {
        if (win32)
            exec('taskkill /pid ' + currentPid + ' /T /F')
        else
            childrens[currentPid].kill("SIGINT")
        process.stdout.write(`Killed process with pid : \x1b[32m${currentPid}\x1b[0m\n`)
        printReadyLine()
        currentPid = null
    }
    else {
        process.stdout.write("No process running in foreground to kill. Use \x1b[31mexit\x1b[0m to quit nodeShell.\n")
        printReadyLine()
    }
})

process.stdin.on("keypress", (str, key) => {
    if (key.ctrl && key.name === "z")
        if (currentPid) {
            process.stdout.write(`Sent process with pid : \x1b[32m${currentPid}\x1b[0m to background.\n    Use fg <pid> to bring it to foreground.\n`)
            currentPid = null
            printReadyLine()
        }
})