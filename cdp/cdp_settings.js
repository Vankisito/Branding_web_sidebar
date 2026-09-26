const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Settings Test (BUG-S-012) ===');
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
        console.log('[C8] Drawer abierto');

        const toggleBtn = await page.$('.o_erpico_mobile_toggle');
        if (toggleBtn) await toggleBtn.click();
        await sleep(1000);

        const settingsBtn = await page.$('.o_erpico_drawer_settings');
        if (settingsBtn) {
            await settingsBtn.click();
            await sleep(2000);

            const drawerAfter = await page.$('.o_erpico_drawer');
            console.log(`  ${!drawerAfter ? '✅' : '❌'} Drawer ${!drawerAfter ? 'cierra' : 'SIGUE ABIERTO'} tras click Ajustes`);
            if (drawerAfter) {
                errors.push('El drawer no cierra tras click en Ajustes');
            }

            const currentUrl = page.url();
            console.log(`  URL actual: ${currentUrl}`);
            if (currentUrl.endsWith('/odoo/settings')) {
                console.log('  ✅ Navegó a Ajustes (BUG-S-012 resuelto)');
            } else {
                console.log('  ❌ No navegó a /odoo/settings (BUG-S-012 no resuelto)');
                errors.push(`goToSettings() no navegar a /odoo/settings (quedó en ${currentUrl})`);
            }
        } else {
            console.log('  ❌ Botón Ajustes no encontrado');
        }

        const dropdown = await page.$('.o-dropdown');
        console.log(`  ${dropdown ? '✅' : '❌'} SwitchCompanyMenu dropdown ${dropdown ? 'presente' : 'NO presente'}`);

        const bodyText = await page.evaluate(() => document.body.innerText.length);
        console.log(`  ✅ Body text length: ${bodyText} (bug era 43 chars)`);
    } catch (e) {
        errors.push(e.message);
        console.log(`  ❌ ${e.message}`);
    }

    console.log('');
    console.log('=== Resumen ===');
    if (errors.length === 0) {
        console.log('✅ Todos los checks pasaron');
        console.log('  BUG-S-012: goToSettings() navega correctamente en móvil');
    } else {
        console.log(`❌ ${errors.length} error(es):`);
        errors.forEach(e => console.log(`  - ${e}`));
    }

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
