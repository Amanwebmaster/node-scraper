const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

async function fetchM3U8(movieUrl) {
    try {
        // Automatically detect Chromium path
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath();
        if (!executablePath) {
            throw new Error('Chromium executable path not found.');
        }

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: executablePath,
            headless: chromium.headless
        });

        const page = await browser.newPage();
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            if (request.resourceType() === 'media' || request.url().includes('.m3u8') || request.url().includes('.mp4')) {
                console.log('Playable URL Found:', request.url());
                page.playableUrl = request.url();
            }
            request.continue();
        });

        await page.goto(movieUrl, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();

        return page.playableUrl || 'No playable URL found';
    } catch (error) {
        console.error('Error fetching the page:', error.message);
        return 'Error fetching the page';
    }
}

app.get('/movie/', async (req, res) => {
    const movieUrl = req.query.Id;
    if (!movieUrl) {
        return res.status(400).send('Missing movie URL');
    }

    const playableUrl = await fetchM3U8(movieUrl);
    res.json({ m3u8: playableUrl });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
