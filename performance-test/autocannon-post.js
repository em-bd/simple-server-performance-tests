const autocannon = require('autocannon')
const os = require('os')
const fs = require('fs')

function logToFile(data) {
    const filePath = 'logged/test_results.json'

    fs.readFile(filePath, (err, fileData) => {
        let jsonData = [];
        if (!err && fileData.length > 0) {
            try {
                jsonData = JSON.parse(fileData)
            } catch (parseError) {
                console.error('Error parsing the existing JSON data:', err)
            }
        }

        jsonData.push(data)

        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file', err)
            }
        })
    })
}

const instance = autocannon({
    url: 'http://localhost:3000',
    connections: 50,
    duration: 10,
    pipelining: 1,
    requests: [
            {
            method: 'POST',
            path: '/', // login attempt
            body: JSON.stringify({
                username: 'admin@simple.org',
                password: 'Resolve2SaveLives'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }
    ]
});

let peakMemory = 0

const memoryMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage().rss
    peakMemory = Math.max(peakMemory, memoryUsage)
}, 1000)

let peakCPU = 0
const cpuMonitor = setInterval(() => {
    const cpus = os.cpus()
    let totalCPUUsage = 0

    cpus.forEach(cpu => {
        const total = Object.values(cpu.times).reduce((acc, vall) => acc + vall, 0)
        const idle = cpu.times.idle
        totalCPUUsage += (1 - idle / total) * 100
    })

    const avgCPUUsage = totalCPUUsage / cpus.length
    peakCPU = Math.max(peakCPU, avgCPUUsage)
}, 1000)

instance.on('done', (result) => {
    clearInterval(memoryMonitor)
    clearInterval(cpuMonitor)

    const logResult = {
        'Throughput': result.requests.average + ' req/sec',
        '95th Percentile Latency': result.latency.p97_5 + 'ms',
        'Error Rate': ((result.errors / result.requests.total) * 100) + '%',
        'Peak Memory Usage': (peakMemory / (1024 * 1024)).toFixed(2) + ' MB',
        'Peak CPU Usage': peakCPU.toFixed(2) + '%',
        'Duration': '10s',
    }

    console.log(logResult)

    logToFile(logResult)
})

autocannon.track(instance)