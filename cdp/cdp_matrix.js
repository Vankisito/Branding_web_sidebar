const puppeteer = require('puppeteer');

const { LOGIN_URL, ODOO_URL, USERS } = require('./qa_config');
const { expectedRailFor } = require('./expected_rail');

/**
 * Payload de /web/webclient/load_menus tal y como lo recibe ESTA sesion.
 * Es la unica entrada que usa la matriz: la expectativa sale de la fixture
 * cdp/expected_rail.js (escrita a mano), nunca de nav_entries.js.
 */
async function menusPayload(page) {
    return page.evaluate(async () => {
        const res = await fetch(`/web/webclient/load_menus?ts=${Date.now()}`, { credentials: 'same-origin' });
        if (!res.ok) {
            throw new Error(`load_menus respondio ${res.status}`);
        }
        return res.json();
    });
}

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
    await page.goto(ODOO_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.o_erpico_sidebar', { timeout: 60000 });
    await sleep(3000);
}

/** Rail renderizado: [{ id, label, xmlids[] }] leído del propio DOM. */
async function railEntries(page) {
    return page.$$eval('.o_erpico_rail_apps .o_erpico_rail_btn', (els) =>
        els.map((el) => ({
            id: el.getAttribute('data-entry'),
            label: el.getAttribute('title'),
            xmlids: (el.getAttribute('data-xmlids') || '').split(',').filter(Boolean),
        }))
    );
}

/**
 * Compara el rail renderizado contra la fixture. Devuelve un objeto con los
 * tres checks, para que quien llama decida si son error o aviso.
 */
function checkRail(errors, role, expected, rendered) {
    const byId = (list) => new Map(list.map((e) => [e.id, e]));
    const exp = byId(expected);
    const got = byId(rendered);
    const missing = expected.filter((e) => !got.has(e.id));
    const extra = rendered.filter((e) => !exp.has(e.id));
    const wrongXmlid = [];
    const wrongLabel = [];
    for (const e of rendered) {
        const want = exp.get(e.id);
        if (!want) continue;
        if (e.label !== want.label) {
            wrongLabel.push(`${e.id}: "${e.label}" en vez de "${want.label}"`);
        }
        if (e.xmlids.join(',') !== want.xmlids.join(',')) {
            wrongXmlid.push(`${e.id}: ${e.xmlids.join(',') || '(vacio)'} en vez de ${want.xmlids.join(',')}`);
        }
    }
    const dump = (list, f) => list.length ? f(list).join(' | ') : 'ninguna';
    console.log(`  [${role}] rail esperado (${expected.length}): ${expected.map((e) => e.label).join(', ') || '(ninguna)'}`);
    console.log(`  [${role}] permitidas ausentes: ${dump(missing, (l) => l.map((e) => e.label))}`);
    if (missing.length) errors.push(`Rail de ${role} pierde entradas permitidas: ${missing.map((e) => e.label).join(', ')}`);
    console.log(`  [${role}] no permitidas visibles: ${dump(extra, (l) => l.map((e) => e.label))}`);
    if (extra.length) errors.push(`Rail de ${role} expone entradas que el servidor no le envia: ${extra.map((e) => e.label).join(', ')}`);
    if (wrongLabel.length) {
        console.log(`  [${role}] etiqueta incorrecta: ${wrongLabel.join(' | ')}`);
        errors.push(`Rail de ${role} con etiqueta incorrecta: ${wrongLabel.join(' | ')}`);
    }
    if (wrongXmlid.length) {
        console.log(`  [${role}] xmlid incorrecto: ${wrongXmlid.join(' | ')}`);
        errors.push(`Rail de ${role} apunta al menu equivocado: ${wrongXmlid.join(' | ')}`);
    }
    return { missing, extra };
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

        // El set de entradas permitidas del admin se guarda para el check de
        // entorno de M7 (si el servidor no filtra, basic y admin coinciden).
        const adminExpected = expectedRailFor(await menusPayload(page));
        console.log(`  [M1] Entradas que el admin puede ver: ${adminExpected.map((e) => e.label).join(', ')}`);
        const adminRendered = await railEntries(page);
        checkRail(errors, 'admin', adminExpected, adminRendered);

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
            if (!drawer) errors.push('El toggle del topbar no abre el drawer');
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
        const ventasExpected = expectedRailFor(await menusPayload(page2));
        const ventasRendered = await railEntries(page2);
        console.log(`  [M5] Rail ventas (${ventasRendered.length}): ${ventasRendered.map((e) => e.label).join(', ')}`);
        if (ventasRendered.length === 0) errors.push('Rail vacio para ventas');
        // D-30: el rail debe reflejar EXACTAMENTE los menús que load_menus le
        // manda a este usuario. La expectativa sale de cdp/expected_rail.js
        // (fixture escrita a mano), no de nav_entries.js, y además se comprueba
        // que cada botón apunte al xmlid correcto: eso detecta un NAV_MAP mal
        // escrito, que antes no era detectable.
        checkRail(errors, 'ventas', ventasExpected, ventasRendered);
        // ventas tiene grupo de ventas: su icono debe estar
        if (!ventasRendered.some((e) => e.id === 'ventas')) {
            errors.push('Rail de ventas no muestra la entrada Ventas pese a tener el grupo de ventas');
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
        const basicExpected = expectedRailFor(await menusPayload(page3));
        const basicRendered = await railEntries(page3);
        console.log(`  [M7] Rail basic (${basicRendered.length}): ${basicRendered.map((e) => e.label).join(', ')}`);
        checkRail(errors, 'basic', basicExpected, basicRendered);
        // La fixture ya cubre el caso "solo-admin": si el servidor le manda a
        // basic el menu de POS, la fixture lo da por permitido y que basic lo
        // muestre deja de ser un fallo del sidebar. Lo que se puede afirmar sin
        // lista hardcodeada es si el servidor esta filtrando algo: si basic
        // recibe exactamente el mismo set que admin, no esta filtrando.
        const adminIds = adminExpected.map((e) => e.id).join(',');
        const basicIds = basicExpected.map((e) => e.id).join(',');
        if (basicIds === adminIds) {
            console.log('  [M7] AVISO: basic recibe el mismo set de entradas que admin.');
            console.log('  [M7]        El servidor no esta filtrando menus por permisos en esta BD;');
            console.log('  [M7]        no es un fallo del sidebar. Diagnostico: node check_menu_leak.js');
        } else {
            const soloAdmin = adminExpected.filter((e) => !basicExpected.some((b) => b.id === e.id));
            console.log(`  [M7] Entradas que el servidor NO manda a basic: ${soloAdmin.length ? soloAdmin.map((e) => e.label).join(', ') : 'ninguna'}`);
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
    // Sin esto la corrida sale con 0 aunque haya checks rojos y cualquier CI
    // queda en verde falso.
    if (errors.length) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
