const express = require('express');
const { spawn } = require('child_process');

const app = express();
const port = 3001;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <form action="/crawl" method="post">
            <input type="text" name="url" placeholder="Enter URL">
            <button type="submit">Crawl</button>
        </form>
    `);
});

app.post('/crawl', (req, res) => {
    const { url } = req.body;
    const crawlProcess = spawn('node', ['crawler.js', url]);

    crawlProcess.stdout.on('data', (data) => {
        console.log(`Crawl output: ${data}`);
    });

    crawlProcess.stderr.on('data', (data) => {
        console.error(`Crawl error: ${data}`);
    });

    crawlProcess.on('close', (code) => {
        console.log(`Crawl process exited with code ${code}`);
    });

    res.send('Crawling started!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});