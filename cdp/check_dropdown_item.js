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

    const result = await page.evaluate(() => {
        const el = document.querySelector('.o_main_navbar .dropdown-item.o-dropdown-item');
        const dd = el ? el.closest('.dropdown-menu') : null;
        const out = { itemBg: null, itemBgRules: [], ddBg: null, ddBgImportant: false };
        if (!el) return { found: false };
        const cs = getComputedStyle(el);
        out.itemBg = cs.backgroundColor;
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText && rule.style && el.matches(rule.selectorText) && rule.style.backgroundColor) {
                        out.itemBgRules.push({ sel: rule.selectorText, bg: rule.style.backgroundColor, imp: rule.style.getPropertyPriority('background-color') });
                    }
                }
            } catch (e) {}
        }
        if (dd) {
            const dcs = getComputedStyle(dd);
            out.ddBg = dcs.backgroundColor;
            out.ddBgImportant = dcs.getPropertyPriority('background-color') === 'important';
        }
        return out;
    });
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})();