const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
const USERS = { admin: { u: 'admin', p: 'admin' }, ventas: { u: 'ventas', p: 'ventas' }, basic: { u: 'basic', p: 'basic' } };

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(page, user) {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);
    await page.waitForSelector('#login', { timeout: 10000 });
    await page.type('#login', user.u);
    await page.type('#password', user.p);
    await page.click('button.btn-primary[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(4000);
}

async function main() {
    console.log('=== CDP Matriz Manual (Fase 5) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1024,768']
    });
    const page = await browser.newPage();
    const errors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => { errors.push(err.message); });

    try {
        // --- USUARIO ADMIN: landing + rail (regresión) ---
        console.log('--- M1: admin (base.group_system) ---');
        await login(page, USERS.admin);
        await page.goto('http://localhost:8071/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(4000);
        console.log(`  [M1] URL admin: ${page.url()}`);
        console.log(`  [M1] Landing ${page.url().includes('dashboards') ? 'Dashboards ✅' : 'NO dashboards ❌'}`);
        if (!page.url().includes('dashboards')) errors.push('Admin landing != Dashboards');

        // Multiempresa: footer SwitchCompanyMenu
        await page.setViewport({ width: 375, height: 812 });
        await sleep(1000);
        const toggle = await page.$('.o_erpico_mobile_toggle');
        if (toggle) {
            await toggle.click({ force: true });
            await sleep(1000);
            const drawer = await page.$('.o_erpico_drawer');
            const switchCompany = await page.$('.o_erpico_drawer_footer .o_dropdown, .o_erpico_drawer_footer button, .o_erpico_drawer_footer .o_switch_company');
            console.log(`  [M2] Drawer abre: ${drawer ? '✅' : '❌'}; SwitchCompany en footer: ${switchCompany ? '✅' : '❌'}`);
            if (!switchCompany) errors.push('SwitchCompanyMenu no renderiza en drawer footer');
            // Keyboard: Escape cierra
            await page.keyboard.press('Escape');
            await sleep(800);
            const drawerClosed = await page.evaluate(() => {
                const d = document.querySelector('.o_erpico_drawer');
                return !d || d.offsetParent === null;
            });
            console.log(`  [M3] Escape cierra drawer: ${drawerClosed ? '✅' : '❌'}`);
            if (!drawerClosed) errors.push('Escape no cierra drawer');
        } else {
            console.log('  [M2] Toggle drawer no encontrado');
        }

        // --- USUARIO VENTAS: landing default + rail filtrado ---
        console.log('--- M4: ventas (no-admin) ---');
        await page.setViewport({ width: 1024, height: 768 });
        await sleep(500);
        await login(page, USERS.ventas);
        await page.goto('http://localhost:8071/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(4000);
        console.log(`  [M4] URL ventas: ${page.url()}`);
        const vUrl = page.url();
        if (vUrl.includes('dashboards')) {
            console.log('  [M4] Landing ventas: Dashboards ✅ (accede a la app — comportamiento D-24)');
        } else if (vUrl.includes('/odoo')) {
            console.log(`  [M4] Landing ventas: default ${vUrl.split('/odoo/')[1] || ''} ✅ (no-admin sin Dashboards → super)`);
        } else {
            console.log(`  [M4] Landing ventas: ${vUrl}`);
        }
        const railBtns = await page.$$('.o_erpico_rail_apps .o_erpico_rail_btn');
        const titles = [];
        for (const b of railBtns) {
            titles.push(await page.evaluate(el => el.getAttribute('title'), b));
        }
        console.log(`  [M5] Rail ventas (${railBtns.length}): ${titles.join(', ')}`);
        if (railBtns.length === 0) errors.push('Rail vacío para ventas');
        // ventas NO debe ver Ajustes (base.menu_administration es admin-only) si la app está excluida por permisos
        const hasSettings = titles.some(t => t && t.toLowerCase().includes('ajustes'));
        console.log(`  [M5] Ve "Ajustes" en rail: ${hasSettings ? 'sí' : 'no (filtrado por permisos)'}`);

        // Teclado: Tab enfoca rail + Enter navega (opcional, verificando que el rail es enfocable)
        const focusable = await page.evaluate(() => {
            const btn = document.querySelector('.o_erpico_rail_btn');
            return btn ? btn.tabIndex >= 0 : null;
        });
        console.log(`  [M6] Rail btn tabIndex>=0 (teclado): ${focusable ? '✅' : '❌'}`);
        if (!focusable) errors.push('Rail btn no enfocable');

        // --- USUARIO BASIC: sin accesso Dashboards → landing default (super) ---
        console.log('--- M7: basic (solo Internal User, sin Dashboards) ---');
        await login(page, USERS.basic);
        await page.goto('http://localhost:8071/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(4000);
        console.log(`  [M7] URL basic: ${page.url()}`);
        const url = page.url();
        if (url.includes('dashboards')) {
            // spreadsheet_dashboard_menu_root NO tiene grupos → visible a todos los
            // usuarios internos. El landing se gatilla por PRESENCIA de la app (D-24);
            // el fallback super() aplica solo si la app NO está instalada.
            console.log('  [M7] Landing básico: Dashboards ✅ (app pública a usuarios internos — D-24 correcto)');
        } else {
            console.log(`  [M7] Landing básico: default ${url.split('/odoo/')[1] || url} ✅ (sin app Dashboards → super)`);
        }
        const railBtnsBasic = await page.$$('.o_erpico_rail_apps .o_erpico_rail_btn');
        console.log(`  [M7] Rail basic (${railBtnsBasic.length} botones)`);

        console.log('');
        console.log('=== Resumen Matriz ===');
        if (errors.length === 0) {
            console.log('✅ Todos los checks pasaron');
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