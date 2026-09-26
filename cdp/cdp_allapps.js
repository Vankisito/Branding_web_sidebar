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
    await page.mouse.click(x, y);
    return { x, y };
}

async function main() {
    console.log('=== CDP All Apps Panel Test (C6) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: true,
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
        console.log('[A1] Login OK, rail montado');

        const allAppsBtn = await page.$('.o_erpico_rail_footer .o_erpico_rail_btn');
        if (!allAppsBtn) {
            console.log('  ❌ Botón allApps no encontrado');
            errors.push('AllApps button not found');
        } else {
            const title = await page.evaluate(el => el.getAttribute('title'), allAppsBtn);
            console.log(`  [A1] Botón allApps: "${title}"`);
            const c = await mouseCenter(page, allAppsBtn);
            await sleep(1500);
            console.log(`  [A2] Click allApps (coords ${Math.round(c.x)},${Math.round(c.y)})`);
        }

        const allAppsPanel = await page.$('.o_erpico_allapps');
        const panelOpen = allAppsPanel && (await allAppsPanel.evaluate(el => getComputedStyle(el).display !== 'none'));
        if (!panelOpen) {
            console.log('  ❌ Panel allApps no visible');
            errors.push('AllApps panel not visible');
        } else {
            const appItems = await page.$$('.o_erpico_allapps_grid li');
            console.log(`  [A3] Apps en panel: ${appItems.length}`);
            if (appItems.length === 0) errors.push('No apps in allApps panel');

            let missingIcon = 0;
            for (const item of appItems) {
                const icon = await item.$('.o_erpico_allapps_icon');
                if (!icon) missingIcon++;
            }
            console.log(`  [A4] Items sin icono: ${missingIcon}`);
            if (missingIcon > 0) errors.push(`${missingIcon} items sin icono en allApps`);

            // Clic en un item → debe cerrar panel y navegar a la app
            const firstItem = await page.$('.o_erpico_allapps_grid li');
            if (firstItem) {
                await mouseCenter(page, firstItem);
                await sleep(2500);
                const panelStillOpen = await page.$('.o_erpico_allapps');
                const panelVisible = panelStillOpen && (await panelStillOpen.evaluate(el => el.offsetParent !== null && getComputedStyle(el).display !== 'none'));
                console.log(`  [A5] Tras click en item → panel ${panelVisible ? 'sigue abierto (❌)' : 'cerrado (✅)'}`);
                if (panelVisible) errors.push('AllApps panel no cierra después de clic');
            } else {
                console.log('  [A5] No hay items para clic');
            }
        }

        // D-29: el rail son las entradas de NAV_MAP resueltas (permisos), en orden.
        const railLabels = await page.$$eval('.o_erpico_rail_apps .o_erpico_rail_btn',
            els => els.map(el => el.getAttribute('aria-label')));
        const totalRail = await page.$$('.o_erpico_rail_btn');
        console.log(`  [A6] Entradas rail: ${railLabels.length} (total rail+footer: ${totalRail.length})`);
        console.log(`       ${railLabels.join(' | ')}`);
        const expectedOrder = ['Inicio', 'CRM', 'Ventas', 'Ecommerce', 'POS', 'Inventario', 'Productos', 'Compras', 'Website', 'Marketing - Email/SMS'];
        const gotOrder = railLabels.filter(l => expectedOrder.includes(l));
        if (JSON.stringify(gotOrder) !== JSON.stringify(expectedOrder)) {
            errors.push(`Orden del rail inesperado: ${gotOrder.join(', ')}`);
        }
        if (railLabels.some(l => !l)) errors.push('Entradas del rail sin aria-label');

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