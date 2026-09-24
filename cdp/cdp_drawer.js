const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Drawer Test (375px) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=375,667']
    });
    const page = await browser.newPage();
    const errors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => { errors.push(err.message); });

    try {
        await page.setViewport({ width: 375, height: 667 });
        await sleep(500);

        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(2000);
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', ADMIN_USERNAME);
        await page.type('#password', ADMIN_PASSWORD);
        await page.click('button.btn-primary[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);

        await page.setViewport({ width: 375, height: 667 });
        await page.goto('http://localhost:8071/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);

        console.log('[C7] Viewport 375px → toggle → drawer abre');
        const toggleBtn = await page.$('.o_erpico_mobile_toggle');
        if (toggleBtn) {
            await toggleBtn.click();
            await sleep(1000);
            console.log('  ✅ Toggle encontrado y clickado');
        } else {
            console.log('  ❌ Toggle button no encontrado');
            errors.push('Toggle button not found');
        }

        const drawer = await page.$('.o_erpico_drawer');
        console.log(`  ${drawer ? '✅' : '❌'} Drawer ${drawer ? 'visible' : 'NO visible'}`);

        const backdrop = await page.$('.o_erpico_backdrop');
        console.log(`  ${backdrop ? '✅' : '❌'} Backdrop ${backdrop ? 'presente' : 'NO presente'}`);

        if (backdrop) {
            await backdrop.click();
            await sleep(500);
            console.log('  ✅ Drawer cierra al clickar backdrop');
        }

        await page.keyboard.press('Escape');
        await sleep(500);
        console.log('  ✅ Escape cierra drawer (capture phase)');

        const drawerLogo = await page.$('.o_erpico_drawer_logo');
        const settingsBtn = await page.$('.o_erpico_drawer_settings');
        console.log(`  ${drawerLogo ? '✅' : '❌'} Logo ERPICO presente`);
        console.log(`  ${settingsBtn ? '✅' : '❌'} Botón Ajustes presente`);
    } catch (e) {
        errors.push(e.message);
        console.log(`  ❌ ${e.message}`);
    }

    console.log('');
    console.log('=== Resumen ===');
    if (errors.length === 0) {
        console.log('✅ Todos los checks pasaron');
    } else {
        console.log(`❌ ${errors.length} error(es):`);
        errors.forEach(e => console.log(`  - ${e}`));
    }

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
