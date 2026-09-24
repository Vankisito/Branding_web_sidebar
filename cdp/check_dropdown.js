const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
    const page = await browser.newPage();
    await page.setViewport({width: 1024, height: 768});
    await page.goto('http://localhost:8071/web/login', {waitUntil: 'networkidle0', timeout: 30000});
    await page.type('#login', 'admin');
    await page.type('#password', 'admin');
    await page.click('button.btn-primary[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));
    await page.goto('http://localhost:8071/odoo', {waitUntil: 'networkidle0', timeout: 30000});
    await new Promise(r => setTimeout(r, 5000));
    await page.mouse.move(0, 0);
    await new Promise(r => setTimeout(r, 500));

    const result = await page.evaluate(() => {
        const toggles = document.querySelectorAll('.o_main_navbar .dropdown-toggle');
        return Array.from(toggles).map(el => ({
            cls: el.className,
            bg: getComputedStyle(el).backgroundColor,
            color: getComputedStyle(el).color,
            border: getComputedStyle(el).borderColor
        }));
    });
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})();
