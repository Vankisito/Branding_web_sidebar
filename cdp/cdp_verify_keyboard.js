const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8071';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitSel(page, sel, tries = 30) {
    for (let i = 0; i < tries; i++) {
        try { await page.waitForSelector(sel, { timeout: 5000 }); return true; } catch (e) { await sleep(1500); }
    }
    return false;
}
async function flyoutVisible(page) {
    const f = await page.$('.o_erpico_flyout');
    if (!f) return false;
    return f.evaluate(el => getComputedStyle(el).display !== 'none' && el.offsetParent !== null);
}
(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    try {
        await page.goto(BASE + '/web/login', { waitUntil: 'networkidle0', timeout: 30000 });
        await waitSel(page, '#login');
        await page.type('#login', 'admin');
        await page.type('#password', 'admin');
        await page.click('button.btn-primary[type="submit"]');
        await sleep(6000);
        await page.goto(BASE + '/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await waitSel(page, '.o_erpico_rail_btn');
        await sleep(1500);

        console.log('[K1] mouse fuera');
        await page.mouse.move(5, 5);
        await sleep(300);

        // Keyboard open: focus segundo botón + ArrowRight
        const btns = await page.$$('.o_erpico_rail_apps .o_erpico_rail_btn');
        console.log('[K2] botones=' + btns.length);
        await btns[0].focus();
        await page.keyboard.press('ArrowRight');
        await sleep(400);
        const afterKeyboard = await flyoutVisible(page);
        console.log('[K3] flyout tras ArrowRight: ' + afterKeyboard);
        if (!afterKeyboard) errors.push('A5: teclado no abrió flyout');

        // Ahora mouse entra al boton y sale → flyout debe cerrar (A5 fix)
        const box = await btns[0].boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(300);
        await page.mouse.move(5, 5);
        await sleep(700);
        const afterLeave = await flyoutVisible(page);
        console.log('[K4] flyout tras mouseleave: ' + afterLeave);
        if (afterLeave) errors.push('A5: flyout pegajoso tras teclado+mouseleave (BUG)');

        // Esc path: reabrir con teclado y cerrar con Escape
        await btns[1].focus();
        await page.keyboard.press('ArrowRight');
        await sleep(300);
        await page.keyboard.press('Escape');
        await sleep(300);
        const afterEsc = await flyoutVisible(page);
        console.log('[K5] flyout tras Escape: ' + afterEsc);
        if (afterEsc) errors.push('Escape no cierra flyout');

        console.log('');
        console.log('=== RESULTADO A5 ===');
        console.log(errors.length === 0 ? 'OK' : errors.join('\n'));
    } catch (e) { console.log('ERROR: ' + e.message); errors.push(e.message); }
    await browser.close();
})();