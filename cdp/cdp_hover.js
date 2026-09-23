const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function mouseCenter(page, handle) {
    const box = await handle.boundingBox();
    if (!box) return null;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    return { x, y };
}

async function main() {
    console.log('=== CDP Hover Test (BUG-S-014) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => { errors.push(err.message); });

    try {
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(2000);
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', ADMIN_USERNAME);
        await page.type('#password', ADMIN_PASSWORD);
        await page.click('button.btn-primary[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);

        await page.goto('http://localhost:8071/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(5000);

        await page.waitForSelector('.o_erpico_rail_btn', { timeout: 15000 });
        console.log('[H1] Login OK, rail renderizado (state.ready)');

        const allBtns = await page.$$('.o_erpico_rail_apps .o_erpico_rail_btn');
        console.log(`  [H1] Botones rail: ${allBtns.length}`);
        if (allBtns.length < 2) { errors.push('Rail insuficiente (<2 botones)'); }

        // H1.5 mouse fuera del rail para estado limpio
        await page.mouse.move(0, 0);
        await sleep(300);

        const firstBtn = allBtns[0];
        const firstTitle = await page.evaluate(el => el.getAttribute('title'), firstBtn);
        const c1 = await mouseCenter(page, firstBtn);
        console.log(`  [H2] Hover "${firstTitle}" (coords ${Math.round(c1.x)},${Math.round(c1.y)})`);
        await sleep(800);
        const flyout = await page.$('.o_erpico_flyout');
        const flyoutVisible = flyout && (await flyout.evaluate(el => getComputedStyle(el).display !== 'none'));
        console.log(`  [H3] Flyout tras hover: ${flyoutVisible ? 'visible' : 'NO visible'}`);
        if (!flyoutVisible) errors.push(`Flyout not visible after hover ${firstTitle}`);

        // Test S-014: transición rápida botón1 → botón2 → flyout debe re-renderizar y quedarse
        if (allBtns.length >= 2) {
            const secondBtn = allBtns[1];
            const secondTitle = await page.evaluate(el => el.getAttribute('title'), secondBtn);
            await mouseCenter(page, secondBtn);
            await sleep(800);
            const flyout2 = await page.$('.o_erpico_flyout');
            const flyout2Visible = flyout2 && (await flyout2.evaluate(el => getComputedStyle(el).display !== 'none'));
            console.log(`  [H4] Hover "${secondTitle}" → flyout ${flyout2Visible ? 'visible' : 'NO visible'}`);
            if (!flyout2Visible) errors.push('BUG-S-014: flyout no visible en transición rápida');

            await sleep(600);
            const flyout2After = await page.$('.o_erpico_flyout');
            const flyout2AfterVisible = flyout2After && (await flyout2After.evaluate(el => getComputedStyle(el).display !== 'none'));
            console.log(`  [H5] +600ms → flyout ${flyout2AfterVisible ? 'sigue visible (FIX OK)' : 'cerrado (BUG)'}`);
            if (!flyout2AfterVisible) errors.push('BUG-S-014: flyout se cierra en transición rápida');

            // mouseleave (sacando mouse del rail) → flyout debe cerrarse tras debounce
            await page.mouse.move(0, 0);
            await sleep(500);
            const flyout3 = await page.$('.o_erpico_flyout');
            const flyout3Visible = flyout3 && (await flyout3.evaluate(el => el.offsetParent !== null && getComputedStyle(el).display !== 'none'));
            console.log(`  [H6] mouseleave +500ms → flyout ${flyout3Visible ? 'sigue (BUG)' : 'cerrado (OK)'}`);
            if (flyout3Visible) errors.push('Flyout no cierra tras mouseleave');
        }

        console.log('');
        console.log('=== Resumen Hover ===');
        if (errors.length === 0) {
            console.log('✅ Todos los checks pasaron (hover estable tras fix S-014)');
        } else {
            console.log(`❌ ${errors.length} error(es):`);
            errors.forEach(e => console.log(`  - ${e}`));
        }
    } catch (e) {
        errors.push(e.message);
        console.log(`  ❌ ${e.message}`);
    }

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });