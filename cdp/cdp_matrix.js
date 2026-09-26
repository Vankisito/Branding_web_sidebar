const puppeteer = require('puppeteer');

const LOGIN_URL = 'http://localhost:8071/web/login';
// uids verificados en la BD de QA (sidebar_test)
const USERS = {
    admin: { u: 'admin', p: 'admin', uid: 2 },
    ventas: { u: 'ventas', p: 'ventas', uid: 17 },
    basic: { u: 'basic', p: 'basic', uid: 18 },
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sessionInfo(page) {
    return page.evaluate(async () => {
        const res = await fetch('/web/session/get_session_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: '{}',
        });
        const data = await res.json();
        return (data && data.result) || null;
    }).catch(() => null);
}

/**
 * Login en un contexto de browser LIMPIO (cookies + localStorage propios).
 *
 * Dos trampas de Odoo 19 encontradas en QA:
 *  1. `/web/logout` NO existe (404); la ruta correcta es `/web/session/logout`.
 *     Con la ruta vieja la sesion anterior sobrevivia y los checks de permisos
 *     corrian con el usuario previo (falso verde).
 *  2. Reutilizar la MISMA pestana para varios logins deja el form de login sin
 *     JS funcional a partir del 3er intento (el click no emite POST). Por eso
 *     cada usuario entra en su propio contexto aislado.
 */
async function loginIsolated(browser, user, viewport) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    if (viewport) {
        await page.setViewport(viewport);
    }
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#login', { timeout: 15000 });
    await page.waitForSelector('button.btn-primary[type="submit"]', { visible: true, timeout: 15000 });
    await page.waitForFunction(() => !!window.odoo, { timeout: 30000 }).catch(() => {});
    await sleep(800);
    await page.type('#login', user.u);
    await page.type('#password', user.p);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('button.btn-primary[type="submit"]'),
    ]);
    // Espera real del webclient: rail montado o mensaje de login invalido
    await page.waitForFunction(
        () => !!document.querySelector('.o_erpico_sidebar')
            || /wrong login|invalid|incorrect/i.test(document.body.innerText),
        { timeout: 60000 }
    );
    await sleep(1500);

    const failed = await page.$eval('body', b => /wrong login|invalid|incorrect/i.test(b.innerText)).catch(() => false);
    if (failed) {
        return { page, context, errors, ok: false, reason: 'credenciales rechazadas' };
    }
    const info = await sessionInfo(page);
    if (!info || info.uid !== user.uid) {
        return {
            page, context, errors, ok: false,
            reason: `sesion uid=${info ? info.uid : 'null'} (esperado ${user.uid})`,
        };
    }
    return { page, context, errors, ok: true, uid: info.uid, isAdmin: !!info.is_admin };
}

async function gotoHome(page) {
    await page.goto('http://localhost:8071/odoo', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.o_erpico_sidebar', { timeout: 60000 });
    await sleep(3000);
}

async function railTitles(page) {
    const btns = await page.$$('.o_erpico_rail_apps .o_erpico_rail_btn');
    const titles = [];
    for (const b of btns) {
        titles.push(await page.evaluate(el => el.getAttribute('title'), b));
    }
    return titles;
}

async function main() {
    console.log('=== CDP Matriz Manual (Fase 5) ===');
    console.log('');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1024,768']
    });
    const errors = [];

    try {
        // --- USUARIO ADMIN: landing + rail (regresion) ---
        console.log('--- M1: admin (base.group_system) ---');
        const s1 = await loginIsolated(browser, USERS.admin, { width: 1024, height: 768 });
        const page = s1.page;
        console.log(`  [M1] Sesion: ${s1.ok ? `uid=${s1.uid} admin=${s1.isAdmin}` : 'ERROR ' + s1.reason}`);
        if (!s1.ok) errors.push(`Login admin fallo: ${s1.reason}`);
        errors.push(...s1.errors);
        await gotoHome(page);
        console.log(`  [M1] URL admin: ${page.url()}`);
        // D-33: el landing es el home de ERPICO, no el dashboard nativo
        const adminHome = await page.$('.o_erpico_home');
        console.log(`  [M1] Landing admin = Inicio (home): ${adminHome ? 'OK' : 'FALLA'}`);
        if (!adminHome) errors.push('Admin: el landing no es el home de ERPICO (D-33)');

        // Multiempresa: footer SwitchCompanyMenu
        await page.setViewport({ width: 375, height: 812 });
        await sleep(1000);
        const toggle = await page.$('.o_erpico_mobile_toggle');
        if (toggle) {
            await toggle.click({ force: true });
            await sleep(1000);
            const drawer = await page.$('.o_erpico_drawer');
            const switchCompany = await page.$('.o_erpico_drawer_footer .o_dropdown, .o_erpico_drawer_footer button, .o_erpico_drawer_footer .o_switch_company');
            console.log(`  [M2] Drawer abre: ${drawer ? 'OK' : 'FALLA'}; SwitchCompany en footer: ${switchCompany ? 'OK' : 'FALLA'}`);
            if (!switchCompany) errors.push('SwitchCompanyMenu no renderiza en drawer footer');
            // Keyboard: Escape cierra
            await page.keyboard.press('Escape');
            await sleep(800);
            const drawerClosed = await page.evaluate(() => {
                const d = document.querySelector('.o_erpico_drawer');
                return !d || d.offsetParent === null;
            });
            console.log(`  [M3] Escape cierra drawer: ${drawerClosed ? 'OK' : 'FALLA'}`);
            if (!drawerClosed) errors.push('Escape no cierra drawer');
        } else {
            console.log('  [M2] Toggle drawer no encontrado');
            errors.push('Toggle drawer no encontrado en 375px');
        }
        await s1.context.close();

        // --- USUARIO VENTAS: landing home + rail filtrado (D-30) ---
        console.log('--- M4: ventas (no-admin) ---');
        const s2 = await loginIsolated(browser, USERS.ventas, { width: 1024, height: 768 });
        const page2 = s2.page;
        console.log(`  [M4] Sesion: ${s2.ok ? `uid=${s2.uid} admin=${s2.isAdmin}` : 'ERROR ' + s2.reason}`);
        if (!s2.ok) errors.push(`Login ventas fallo: ${s2.reason}`);
        errors.push(...s2.errors);
        await gotoHome(page2);
        console.log(`  [M4] URL ventas: ${page2.url()}`);
        const ventasHome = await page2.$('.o_erpico_home');
        console.log(`  [M4] Landing ventas = Inicio (home): ${ventasHome ? 'OK' : 'FALLA'}`);
        if (!ventasHome) errors.push('Ventas: el landing no es el home de ERPICO (D-33)');
        const titles = await railTitles(page2);
        console.log(`  [M5] Rail ventas (${titles.length}): ${titles.join(', ')}`);
        if (titles.length === 0) errors.push('Rail vacio para ventas');
        // D-30: el rail refleja load_menus (filtrado por group_ids en core).
        // ventas = base.group_user + sales_team.group_sale_salesman
        const mustBeHidden = ['POS', 'Inventario', 'Productos', 'Compras', 'Marketing - Email/SMS'];
        const leaked = mustBeHidden.filter(l => titles.includes(l));
        console.log(`  [M5] Entradas que NO deberian verse: ${leaked.length ? 'FALLAN ' + leaked.join(', ') : 'ninguna OK'}`);
        if (leaked.length) {
            errors.push(`Rail de ventas expone entradas sin permiso: ${leaked.join(', ')}`);
        }
        // crm/website_sale root = "Sales / User: Own Documents Only"; website root = "Role / User"
        const mustBeVisible = ['Inicio', 'CRM', 'Ventas', 'Ecommerce', 'Website'];
        const missing = mustBeVisible.filter(l => !titles.includes(l));
        console.log(`  [M5] Entradas que SI deberian verse: ${missing.length ? 'FALTAN ' + missing.join(', ') : 'todas OK'}`);
        if (missing.length) {
            errors.push(`Rail de ventas pierde entradas permitidas: ${missing.join(', ')}`);
        }

        // Teclado: rail enfocable
        const focusable = await page2.evaluate(() => {
            const btn = document.querySelector('.o_erpico_rail_btn');
            return btn ? btn.tabIndex >= 0 : null;
        });
        console.log(`  [M6] Rail btn tabIndex>=0 (teclado): ${focusable ? 'OK' : 'FALLA'}`);
        if (!focusable) errors.push('Rail btn no enfocable');
        await s2.context.close();

        // --- USUARIO BASIC: solo Internal User (D-30) ---
        console.log('--- M7: basic (solo Internal User) ---');
        const s3 = await loginIsolated(browser, USERS.basic, { width: 1024, height: 768 });
        const page3 = s3.page;
        console.log(`  [M7] Sesion: ${s3.ok ? `uid=${s3.uid} admin=${s3.isAdmin}` : 'ERROR ' + s3.reason}`);
        if (!s3.ok) errors.push(`Login basic fallo: ${s3.reason}`);
        errors.push(...s3.errors);
        await gotoHome(page3);
        console.log(`  [M7] URL basic: ${page3.url()}`);
        const basicHome = await page3.$('.o_erpico_home');
        console.log(`  [M7] Landing basico = Inicio (home): ${basicHome ? 'OK' : 'FALLA'}`);
        if (!basicHome) errors.push('Basic: el landing no es el home de ERPICO (D-33)');
        const basicCards = await page3.$$eval('.o_erpico_home_card', els => els.map(e => e.textContent.trim().split('\n')[0]));
        console.log(`  [M7] Cards del home: ${basicCards.length} -> ${basicCards.join(' | ') || '(ninguna)'}`);
        const basicTitles = await railTitles(page3);
        console.log(`  [M7] Rail basic (${basicTitles.length}): ${basicTitles.join(', ')}`);
        // D-30: basic = solo base.group_user. El rail queda en Inicio + Website
        // (website.menu_website_configuration solo pide "Role / User", que core
        // concede a los internal users); el resto de apps no son visibles.
        const basicAllowed = ['Inicio', 'Website'];
        const basicLeaked = basicTitles.filter(t => !basicAllowed.includes(t));
        console.log(`  [M7] Entradas no permitidas: ${basicLeaked.length ? 'FALLAN ' + basicLeaked.join(', ') : 'ninguna OK'}`);
        if (basicLeaked.length) {
            errors.push(`Rail de basic expone entradas sin permiso: ${basicLeaked.join(', ')}`);
        }
        const basicMissing = basicAllowed.filter(t => !basicTitles.includes(t));
        console.log(`  [M7] Entradas permitidas ausentes: ${basicMissing.length ? 'FALTAN ' + basicMissing.join(', ') : 'ninguna OK'}`);
        if (basicMissing.length) {
            errors.push(`Rail de basic pierde entradas permitidas: ${basicMissing.join(', ')}`);
        }
        await s3.context.close();

        console.log('');
        console.log('=== Resumen Matriz ===');
        if (errors.length === 0) {
            console.log('OK: todos los checks pasaron');
        } else {
            console.log(`FALLARON ${errors.length} check(s):`);
            errors.forEach(e => console.log(`  - ${e}`));
        }
    } catch (e) {
        errors.push(e.message);
        console.log(`  ERROR: ${e.message}`);
    }

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
