const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8071';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitSel(page, sel, tries = 15) {
    for (let i = 0; i < tries; i++) {
        try {
            await page.waitForSelector(sel, { timeout: 5000 });
            return true;
        } catch (e) { await sleep(1500); }
    }
    return false;
}

async function main() {
    console.log('=== CDP AUDIT VERIFY (A2 crash + A8 layout) ===');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('console: ' + m.text()); });

    try {
        console.log('[L1] login page...');
        await page.goto(BASE + '/web/login', { waitUntil: 'networkidle0', timeout: 30000 });
        if (!(await waitSel(page, '#login'))) throw new Error('login form no encontrado');
        await page.type('#login', 'admin');
        await page.type('#password', 'admin');
        await page.click('button.btn-primary[type="submit"]');
        await sleep(6000);
        console.log('[L2] post-login url=' + page.url());

        console.log('[V1] goto /odoo');
        await page.goto(BASE + '/odoo', { waitUntil: 'networkidle0', timeout: 30000 });
        const hasSidebar = await waitSel(page, '.o_erpico_sidebar');
        console.log('[V1] sidebar en DOM: ' + hasSidebar + ' url=' + page.url());
        if (!hasSidebar) {
            console.log('  dump body head:', (await page.evaluate(() => document.body ? document.body.innerHTML.slice(0, 300) : 'NO BODY')));
            throw new Error('sidebar no aparece tras login');
        }
        await sleep(2500);

        console.log('[V2] Navegar Settings (app con secciones)...');
        await page.goto(BASE + '/odoo/action-base.menu_administration', { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(5000);
        const nav1 = await page.evaluate(() => {
            const navbar = document.querySelector('.o_main_navbar');
            const secmenu = document.querySelector('.o_menu_sections');
            return {
                navbar: !!navbar,
                navbarHtml: navbar ? navbar.innerHTML.length : 0,
                hasSections: !!secmenu,
                sectionsHtml: secmenu ? secmenu.innerHTML.length : 0,
                moduleBrand: !!document.querySelector('.o_erpico_module_brand'),
                breadcrumbUl: !!document.querySelector('.o_navbar_breadcrumbs ol, .o_navbar_breadcrumbs .breadcrumb'),
                url: location.pathname + location.search,
            };
        });
        console.log('[V2] ' + JSON.stringify(nav1));
        if (!nav1.navbar || nav1.navbarHtml < 100) errors.push('A2-CRASH navbar muerto en app con secciones');
        if (nav1.hasSections && nav1.sectionsHtml < 10) errors.push('A2 sections renderizó vacio');
        console.log('[V2] breadcrumbs ul en navbar: ' + nav1.breadcrumbUl);

        const layout = await page.evaluate(() => {
            const rect = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: Math.round(r.x), w: Math.round(r.width) };
            };
            return {
                rail: rect('.o_erpico_sidebar'),
                actionManager: rect('.o_action_manager'),
                content: rect('.o_content'),
                controlPanel: rect('.o_control_panel'),
            };
        });
        console.log('[V3] ' + JSON.stringify(layout));
        const cp = layout.controlPanel, ct = layout.content, rail = layout.rail;
        if (cp && ct && rail) {
            if (Math.abs(cp.x - rail.w) > 10) errors.push('A8 control_panel no alineado a rail (x=' + cp.x + ', rail w=' + rail.w + ')');
            if (ct.x - cp.x > 10) errors.push('A8 doble-margen o_content desfasado ' + (ct.x - cp.x) + 'px vs control_panel');
        }

        await page.screenshot({ path: 'C:/Users/Santi/AppData/Local/Temp/opencode/core19/audit_settings.png' });
        console.log('[V4] screenshot ok');

        console.log('');
        console.log('=== RESULTADO ===');
        if (errors.length === 0) console.log('TODO OK');
        else { console.log(errors.length + ' hallazgo(s):'); errors.forEach(e => console.log('  - ' + e)); }
    } catch (e) {
        errors.push(e.message);
        console.log('ERROR: ' + e.message);
    }
    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });