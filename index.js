const sth = async () => {
    console.log("process std scheduled for 50 seconds")
    let i = 0
    setInterval(() => {
        console.log(`${i} seconds elapsed`)
    }, 1000)
    setTimeout(() => {
        console.log('sth');
        return
    }, 50000);
}

(async () => {
    await sth()
})()

process.on("SIGINT", () => {
    console.log("Gracefully shutting down from SIGINT (Ctrl-C)")
    process.exit(0)
})