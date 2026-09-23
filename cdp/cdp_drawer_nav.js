const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP Drawer Navigation Test (BUG-S-013) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=375,667']
    });
    const page = await browser.newPage();
    const errors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => { errors.push(err.message); });

    try {
        await page.setViewport({ width: 375, height: 667 });
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
        console.log('[D1] Viewport móvil → login OK');

        // Abrir drawer
        const toggleBtn = await page.$('.o_erpico_mobile_toggle');
        if (toggleBtn) {
            await toggleBtn.click();
            await sleep(1000);
            console.log('[D2] Drawer abierto con toggle');
        } else {
            // Drawer puede abrirse por evento
            await page.evaluate(() => window.dispatchEvent(new Event('erpico:open-drawer')));
            await sleep(1000);
            console.log('[D2] Drawer abierto por evento');
        }

        const drawer = await page.$('.o_erpico_drawer');
        console.log(`  Drawer visible: ${drawer ? '✅' : '❌'}`);

        // Click en una app del drawer (CRM)
        const drawerAppBtn = await page.$('.o_erpico_drawer_app_btn');
        if (drawerAppBtn) {
            await drawerAppBtn.click();
            await sleep(2000);

            const drawerAfterNav = await page.$('.o_erpico_drawer');
            const drawerVisible = drawerAfterNav && (await drawerAfterNav.evaluate(el => el.offsetParent !== null));
            console.log(`  [D3] Después de click app → drawer visible: ${drawerVisible ? '⚠️ SÍ (BUG-S-013)' : '✅ NO (cerró)'}`);
            if (drawerVisible) errors.push('BUG-S-013: drawer no cierra al navegar app');
        } else {
            console.log('  ❌ No hay app btn en drawer');
        }

        // Click en submenu del drawer
        const drawerSub = await page.$('.o_erpico_drawer_sub li');
        if (drawerSub) {
            await drawerSub.click();
            await sleep(2000);

            const drawerAfterSub = await page.$('.o_erpico_drawer');
            const drawerVisibleSub = drawerAfterSub && (await drawerAfterSub.evaluate(el => el.offsetParent !== null));
            console.log(`  [D4] Después de click submenu → drawer visible: ${drawerVisibleSub ? '⚠️ SÍ (BUG-S-013)' : '✅ NO (cerró)'}`);
            if (drawerVisibleSub) errors.push('BUG-S-013: drawer no cierra al navegar submenu');
        }

        // Click Ajustes (ya probado, debería cerrar)
        const settingsBtn = await page.$('.o_erpico_drawer_settings');
        if (settingsBtn) {
            await settingsBtn.click();
            await sleep(2000);
            const drawerAfterSettings = await page.$('.o_erpico_drawer');
            const drawerVisibleSettings = drawerAfterSettings && (await drawerAfterSettings.evaluate(el => el.offsetParent !== null));
            console.log(`  [D5] Después de click Ajustes → drawer visible: ${drawerVisibleSettings ? '❌' : '✅ cerró'}`);
        }

        console.log('');
        console.log('=== Resumen Drawer Nav ===');
        if (errors.length === 0) {
            console.log('✅ Todos los checks pasaron (drawer cierra al navegar)');
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
