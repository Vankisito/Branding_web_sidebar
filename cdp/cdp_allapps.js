const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('=== CDP All Apps Panel Test (C6) ===');
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

        // Esperar rail
        await page.waitForSelector('.o_erpico_rail_btn', { timeout: 15000 });
        console.log('[A1] Login OK, rail montado');

        // Click en el botón "Todas las aplicaciones" (footer del rail)
        const allAppsBtn = await page.$('.o_erpico_rail_footer .o_erpico_rail_btn');
        if (!allAppsBtn) {
            console.log('  ❌ Botón allApps no encontrado');
            errors.push('AllApps button not found');
        } else {
            const rect = await allAppsBtn.evaluate(el => el.getBoundingClientRect());
            await page.mouse.move(rect.left + rect.width / 2, rect.top + rect.height / 2);
            await page.mouse.down();
            await page.mouse.up();
            await sleep(1500);
            console.log('[A2] Click botón allApps');
        }

        const allAppsPanel = await page.$('.o_erpico_allapps');
        if (!allAppsPanel) {
            console.log('  ❌ Panel allApps no visible');
            errors.push('AllApps panel not visible');
        } else {
            const appItems = await page.$$('.o_erpico_allapps_grid li');
            console.log(`  [A3] Apps en panel: ${appItems.length}`);

            if (appItems.length === 0) {
                errors.push('No apps in allApps panel');
            }

            // Verificar items tienen nombre e icono
            let missingIcon = 0;
            for (const item of appItems) {
                const icon = await item.$('.o_erpico_allapps_icon');
                if (!icon) missingIcon++;
            }
            console.log(`  [A4] Items sin icono: ${missingIcon}`);
            if (missingIcon > 0) errors.push(`${missingIcon} items sin icono en allApps`);
        }

        // Clic en un item → debe cerrar panel
        const firstItem = await page.$('.o_erpico_allapps_grid li');
        if (firstItem) {
            const rect = await firstItem.evaluate(el => el.getBoundingClientRect());
            await page.mouse.move(rect.left + rect.width / 2, rect.top + rect.height / 2);
            await page.mouse.down();
            await page.mouse.up();
            await sleep(2000);
            const panelStillOpen = await page.$('.o_erpico_allapps');
            const panelVisible = panelStillOpen && (await panelStillOpen.evaluate(el => el.offsetParent !== null));
            console.log(`  [A5] Después de click → panel still open: ${panelVisible ? '❌' : '✅ cerró'}`);
            if (panelVisible) errors.push('AllApps panel no cierra después de clic');
        } else {
            console.log('  [A5] No hay items para clic');
        }

        // Verificar rail tiene 12 botones (C2)
        const railBtns = await page.$$('.o_erpico_rail_apps .o_erpico_rail_btn');
        console.log(`  [A6] Botones rail: ${railBtns.length}`);
        if (railBtns.length !== 12) errors.push(`Rail tiene ${railBtns.length} botones (esperado 12)`);

        console.log('');
        console.log('=== Resumen AllApps ===');
        if (errors.length === 0) {
            console.log('✅ Panel allApps funcional');
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
