const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Hover Test (BUG-S-014) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1024,768']
    });
    const page = await browser.newPage();
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
        await sleep(4000);

        // Esperar que el rail esté montado (state.ready)
        await page.waitForSelector('.o_erpico_rail_btn', { timeout: 15000 });
        console.log('[H1] Login OK, rail renderizado (state.ready)');

        // Obtener el primer botón rail
        const firstRailBtn = await page.$('.o_erpico_rail_btn');
        if (!firstRailBtn) {
            console.log('  ❌ No hay botones rail');
            errors.push('No rail buttons');
        } else {
            const btnTitle = await page.evaluate(el => el.getAttribute('title'), firstRailBtn);
            console.log(`  [H2] Primer botón: "${btnTitle}"`);

            // Obtener coordenadas y hacer hover con mouse.move (evita "not clickable")
            const rect = await firstRailBtn.evaluate(el => el.getBoundingClientRect());
            await page.mouse.move(rect.left + rect.width / 2, rect.top + rect.height / 2);
            await sleep(800);
            const flyout = await page.$('.o_erpico_flyout');
            console.log(`  [H3] Hover "${btnTitle}" → flyout ${flyout ? 'visible' : 'NO visible'}`);
            if (!flyout) errors.push(`Flyout not visible after hover ${btnTitle}`);

            // Obtener segundo botón
            const allBtns = await page.$$('.o_erpico_rail_btn');
            if (allBtns.length >= 2) {
                const secondBtn = allBtns[1];
                const secondTitle = await page.evaluate(el => el.getAttribute('title'), secondBtn);

                // Test: hover rápido al segundo botón (mouse.move)
                const rect2 = await secondBtn.evaluate(el => el.getBoundingClientRect());
                await page.mouse.move(rect2.left + rect2.width / 2, rect2.top + rect2.height / 2);
                await sleep(800);
                const flyout2 = await page.$('.o_erpico_flyout');
                console.log(`  [H4] Hover "${secondTitle}" inmediatamente → flyout ${flyout2 ? 'visible' : 'NO visible'}`);

                // Esperar y verificar que flyout permanece (el fix cancela timer)
                await sleep(600);
                const flyout2After = await page.$('.o_erpico_flyout');
                console.log(`  [H5] Después de 600ms → flyout ${flyout2After ? 'visible (FIX OK)' : 'cerrado (BUG)'}`);
                if (!flyout2After) errors.push('BUG-S-014: flyout se cierra en transición rápida');

                // Test: mouseleave + mouseenter rápido
                await page.mouse.move(0, 0);
                await sleep(200);
                const rect2b = await secondBtn.evaluate(el => el.getBoundingClientRect());
                await page.mouse.move(rect2b.left + rect2b.width / 2, rect2b.top + rect2b.height / 2);
                await sleep(800);
                const flyout3 = await page.$('.o_erpico_flyout');
                console.log(`  [H6] mouseleave+hover rápido → flyout ${flyout3 ? 'visible (FIX OK)' : 'NO visible (BUG-S-014)'}`);
                if (!flyout3) errors.push('BUG-S-014: flyout cierra en transición rápida');
            }
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
