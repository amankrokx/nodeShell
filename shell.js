// Path: nodeShell\shell.js

/**
 * @param {string} input
 * @description
 * nodeShell created by amankrokx
 * This is a simple shell emulator or wrapper in nodejs.
 * 
 */

// Imports
const { exec } = require("child_process")
const fs = require("fs")
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Read from input in raw mode
readline.rawListeners("line")
// Windows workaround for ctrl + c
readline.on("SIGINT", () => {
    process.emit("SIGINT")
})
// Variable to check for windows
let win32 = false
if (process.platform === "win32")
    win32 = true

// Variable to store spawned childrens
let currentPid = null
let childrens = {}

// Function to print current ready line
function printReadyLine(pid) {
    if (!pid) process.stdout.write(`\x1b[36mnodeShell > \x1b[0m${process.cwd()} \x1b[35m$\x1b[0m `)
    else process.stdout.write(`\x1b[36mnodeShell > \x1b[32m${pid || currentPid}\x1b[0m > `)
}

// Send process to background
// Basically just don't listen
// Not specified wether to use SIGTSTP or SIGSTOP
function sendToBackground() {
    if (currentPid) {
        // Not gonna use as not specified in assignment
        // childrens[currentPid].stdin.pause()
        process.stdout.write(`Sent process with pid : \x1b[32m${currentPid}\x1b[0m to background.\n    Use fg <pid> to bring it to foreground.\n`)
        currentPid = null
        printReadyLine()
    } else {
        process.stdout.write("No process running in foreground to send to background.\n")
        printReadyLine()
    }
}

// Function to spawn child process
function spawnChildWithExec(input) {
    const child = exec(input)
    child.stdout.on("data", (data) => {
        if (currentPid === child.pid)
            process.stdout.write(data + "\n")
    })
    child.stderr.on("data", (data) => {
        if (currentPid === child.pid)
            process.stdout.write(data + "\n")
    })
    child.on("close", (code) => {
        if (currentPid === child.pid) {
            process.stdout.write(`Child process exited with code ${code}\n`)
            printReadyLine()
            currentPid = null
        }
        delete childrens[child.pid]
    })

    // Save child process details for future use
    childrens[child.pid] = child
    currentPid = child.pid
}

// print init message
const printHelp = () => {
    process.stdout.write(
        "\n######## \x1b[34mWelcome to nodeShell\x1b[0m ########\nType \x1b[33mhelp\x1b[0m to get this text.\n\nWorking commands :\n\
        \x1b[1mcd <directory>          \x1b[0m  - changes current directory, \x1b[32m.\x1b[0m and \x1b[32m..\x1b[0m works.\n\
        \x1b[1mpwd                     \x1b[0m  - prints current working directory\n\
        \x1b[1mls <path>               \x1b[0m  - lists all files and folders in provided path\n\
        \x1b[1m<path_to_binary> <args> \x1b[0m  - Spawns new process of given executable\n\
                                    Supports direct executable if already added in path\n\
        \x1b[1mfg <pid>                \x1b[0m  - Brings background process with pid to forground\n\
        \x1b[1mexit                    \x1b[0m  - To close all spawned processes and exit shell (don't use ctrl + d)\n\
        \n\
        \x1b[1mCtrl + C                \x1b[0m  - Sends a SIGINT to spawned process\n\
        \x1b[1mCtrl + Z                \x1b[0m  - Sends spawned process to background and prints pid\n\n"
    )
}

printHelp()
printReadyLine()
readline.on("line", (input) => {
    if (currentPid) {
        childrens[currentPid].stdin.write(input)
        printReadyLine(currentPid)
        return
    }

    if (!input) {
        printReadyLine()
        return
    }

    switch (input) {
        // Exit shell
        case "exit":
            // Kill all spawned processes
            for (const child of Object.values(childrens)) if (!child.killed) child.kill()
            // Exit shell
            process.stdout.write("\nExiting nodeShell...\n")
            process.exit()
        // Print help
        case "help":
            printHelp()
            break

        // List files and folders
        // No need for arguments as mentioned in the assignment
        case "ls":
            fs.readdirSync(process.cwd()).forEach(file => {
                process.stdout.write(file + "\n")
            })
        break
            
        // Print current working directory
        case "pwd":
            process.stdout.write(process.cwd() + "\n")
            break

        // other commands
        default:
            // CD command
            if (input.startsWith("cd")) {
                // Split input into command and arguments
                const path = input.split(" ")[1]
                // Change directory if exists otherwise catch error
                try {
                    process.chdir(path)
                } catch (err) {
                    process.stdout.write(err + "\n")
                }

            // fg command
            } else if (input.startsWith("fg")) {
                // Split input into command and arguments
                const pid = input.split(" ")[1]
                // Check if pid is valid
                if (childrens[pid] && childrens[pid].killed === false) {
                    process.stdout.write(`Brought process ${pid} to foreground\n`)
                    currentPid = pid
                } else process.stdout.write(`Process ${pid} died or doesn't exist\n`)
            
            // binary files or something just run it
            } else spawnChildWithExec(input)
            // break is not required here as we are returning from the function
            // but it feels nice to have it here
            break
    }

    // Print ready line
    if (!currentPid)
        printReadyLine()
    else
        printReadyLine(currentPid)
})

// Handle Ctrl + C
process.on("SIGINT", () => {
    if (currentPid) {
        // If foreground process is running kill process
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

// Handle Ctrl + Z
process.on("SIGTSTP", sendToBackground)

// To capture Ctrl + Z
process.stdin.on("keypress", (str, key) => {
    if (key.ctrl && key.name === "z")
        sendToBackground()
    if (key.ctrl && key.name === "d") {
        process.stdout.write("Use \x1b[31mexit\x1b[0m to quit nodeShell.\nSince you upset me, I'm going to kill myself.")
        process.exit()
    }
})