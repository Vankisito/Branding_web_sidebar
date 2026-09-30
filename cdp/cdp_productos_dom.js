/**
 * QA del render de la entrada "Productos" (D-41) en el drawer movil.
 *
 * Uso:  node cdp_productos_dom.js [inv|basic]
 *        node cdp_productos_dom.js            (corre los dos)
 *
 * Para otra BD:  ODOO_URL=... ODOO_DB=mi_bd node cdp_productos_dom.js
 *
 * `check_product_menus.js` verifica los permisos contra /web/webclient/load_menus,
 * o sea que los menus existen y son alcanzables. Eso NO alcanza para el bug que
 * motiva D-41: antes de arreglarlo, la entrada "Productos" aparecia en el rail y
 * su drawer salia VACIO, porque cada seccion era una hoja accionable
 * (`childrenTree` vacio) y las plantillas solo iteraban `section.childrenTree`.
 * Eso solo se ve en el DOM.
 *
 * Se corre con dos usuarios a proposito:
 *   inv   -> rol Inventario ERPICO. Debe ver 2 items (Productos, Variantes).
 *            Le faltan sales_team.group_sale_salesman, asi que Listas de precios
 *            y Atributos no son alcanzables y el sidebar las omite a proposito.
 *   basic -> grupos usuario de las 4 apps. Debe ver los 4.
 *
 * Detalle de Puppeteer ya conocido en este repo (mismo que cdp_drawer_reporting.js):
 * a 375px el click por coordenadas no alcanza el toggle movil (`rect.y === 0`),
 * asi que se dispara con `element.click()` desde dentro de la pagina.
 *
 * Sale con codigo 1 si falla cualquier check.
 */
const puppeteer = require('puppeteer');
const { LOGIN_URL, ODOO_URL, USERS } = require('./qa_config');

// El texto que se pinta NO es el `label` de la seccion de NAV_MAP (ese solo
// sirve como clave de agrupacion del t-foreach), sino el `name` del menu del
// core, traducido al idioma del usuario. Por eso las expectativas van en el
// idioma de cada usuario y no en el de la BD.
//   inv   -> en_US: ve 2 items, no tiene sales_team.group_sale_salesman.
//   basic -> es_CO: ve los 4.
const CASES = [
    ['inv', ['Products', 'Product Variants']],
    ['basic', ['Productos', 'Variantes del producto', 'Listas de precios', 'Atributos']],
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// El browser se comparte entre casos, asi que la sesion del caso anterior sigue
// viva y /web/login puede no mostrar el formulario real. Cuando eso pasa, Chrome
// se queja por consola de "An invalid form control with name='login' is not
// focusable". Es ruido del harness, no del sidebar, asi que se filtra.
const BENIGN_CONSOLE = /An invalid form control with name='(login|password)' is not focusable/;
function noteConsole(errors, login, text) {
    if (!BENIGN_CONSOLE.test(text)) {
        errors.push(`[${login}] console: ${text}`);
    }
}

// Devuelve los labels de 2do nivel bajo la app "Productos" del drawer.
async function readProductosDrawer() {
    const apps = Array.from(document.querySelectorAll('.o_erpico_drawer_app'));
    const app = apps.find((a) => {
        const t = a.querySelector('.o_erpico_drawer_app_title, .o_erpico_drawer_app_label, button, span');
        return t && /Productos/i.test(t.textContent || '');
    });
    if (!app) {
        return { found: false, items: [], groupHeaders: [] };
    }
    const items = Array.from(app.querySelectorAll('.o_erpico_drawer_sub > li:not(.o_erpico_drawer_group_item) > span'))
        .map((s) => (s.textContent || '').trim())
        .filter(Boolean);
    const groupHeaders = Array.from(app.querySelectorAll('.o_erpico_drawer_group'))
        .map((s) => (s.textContent || '').trim())
        .filter(Boolean);
    return { found: true, items, groupHeaders };
}

// El drawer arma `entry.sections` de forma asincrona: hay que esperar a que la
// lista de items se estabilice antes de leerla.
async function waitForStableProductos(page, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    let prev = -1;
    while (Date.now() < deadline) {
        const now = await page.evaluate(readProductosDrawer);
        const n = now.found ? now.items.length : -1;
        if (n >= 0 && n > 0 && n === prev) return now;
        prev = n;
        await sleep(300);
    }
    return page.evaluate(readProductosDrawer);
}

async function runCase(browser, login, expected) {
    const user = USERS[login];
    const errors = [];
    console.log(`\n--- ${login} (uid ${user.uid}) ---`);

    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 });
    page.on('console', (m) => { if (m.type() === 'error') noteConsole(errors, login, m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    try {
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(1500);
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', user.u);
        await page.type('#password', user.p);
        await sleep(300);
        await page.evaluate(() => {
            const b = document.querySelector('button.btn-primary[type="submit"]');
            if (b) b.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
        await sleep(3000);

        await page.goto(ODOO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);

        const opened = await page.evaluate(() => {
            const t = document.querySelector('.o_erpico_mobile_toggle');
            if (!t) return false;
            t.click();
            return true;
        });
        if (!opened) {
            errors.push('no se encontro el toggle movil .o_erpico_mobile_toggle');
        }
        await sleep(1200);

        const drawer = await page.evaluate(readProductosDrawer);
        if (!drawer.found) {
            errors.push('la app "Productos" no aparece en el drawer');
            return errors;
        }
        console.log(`  items renderizados: [${drawer.items.join(' | ')}]`);
        console.log(`  cabeceras de grupo: [${drawer.groupHeaders.join(' | ')}]`);

        if (!drawer.items.length) {
            errors.push('el drawer de Productos sigue vacio (childrenTree vacio sin fallback a leaf)');
            return errors;
        }

        for (const label of expected) {
            if (!drawer.items.includes(label)) {
                errors.push(`falta el item "${label}" en el drawer de Productos`);
            }
        }
        if (drawer.items.length !== expected.length) {
            errors.push(
                `el drawer de Productos tiene ${drawer.items.length} items y se esperaban ${expected.length}: [${drawer.items.join(' | ')}]`
            );
        }
        // Las hojas accionables no deben título de grupo: el label va en el item.
        if (drawer.groupHeaders.length) {
            errors.push(
                `se pintaron cabeceras de grupo para items que son hojas: [${drawer.groupHeaders.join(' | ')}]`
            );
        }

        // El primer item debe navegar de verdad (no ser un boton decorativo).
        const before = page.url();
        await page.evaluate(() => {
            const apps = Array.from(document.querySelectorAll('.o_erpico_drawer_app'));
            const app = apps.find((a) => {
                const t = a.querySelector('.o_erpico_drawer_app_title, .o_erpico_drawer_app_label, button, span');
                return t && /Productos/i.test(t.textContent || '');
            });
            const btn = app && app.querySelector('.o_erpico_drawer_sub > li:not(.o_erpico_drawer_group_item)');
            if (btn) btn.click();
        });
        await sleep(2500);
        if (page.url() === before) {
            errors.push('clickear el primer item de Productos no navego');
        } else {
            console.log(`  navegacion: ${before} -> ${page.url()}`);
        }
    } catch (e) {
        errors.push(`excepcion: ${e.message}`);
    } finally {
        await page.close();
    }
    return errors;
}

// Mismo contrato en el flyout de escritorio, que es la otra mitad del fix:
// sin el fallback a `section.leaf` el `ul.o_erpico_flyout_menu` sale vacío.
async function readProductosFlyout() {
    const flyout = document.querySelector('.o_erpico_flyout');
    if (!flyout || flyout.offsetParent === null) {
        return { visible: false, items: [], groups: [] };
    }
    const items = Array.from(flyout.querySelectorAll('.o_erpico_flyout_menu > li > .o_erpico_flyout_item'))
        .map((b) => (b.textContent || '').trim())
        .filter(Boolean);
    const groups = Array.from(flyout.querySelectorAll('.o_erpico_flyout_menu > li > .o_erpico_flyout_group'))
        .map((s) => (s.textContent || '').trim())
        .filter(Boolean);
    return { visible: true, items, groups };
}

async function waitForStableFlyout(page, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    let prev = -1;
    while (Date.now() < deadline) {
        const now = await page.evaluate(readProductosFlyout);
        const n = now.visible ? now.items.length : -1;
        if (n > 0 && n === prev) return now;
        prev = n;
        await sleep(300);
    }
    return page.evaluate(readProductosFlyout);
}

async function runFlyoutCase(browser, login, expected) {
    const user = USERS[login];
    const errors = [];
    console.log(`\n--- ${login} escritorio / flyout ---`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    page.on('console', (m) => { if (m.type() === 'error') noteConsole(errors, login, m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    try {
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(1500);
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', user.u);
        await page.type('#password', user.p);
        // Click por DOM y no por coordenadas: el submit por coordenadas es
        // flaky y en este repo ya se sabe que falla (ver cdp_drawer_reporting.js).
        await sleep(300);
        await page.evaluate(() => {
            const b = document.querySelector('button.btn-primary[type="submit"]');
            if (b) b.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
        await sleep(3000);

        await page.goto(ODOO_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(3000);

        const hovered = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('.o_erpico_rail_item, .o_erpico_rail button, .o_erpico_rail a'))
                .find((b) => /Productos/i.test((b.getAttribute('title') || '') + (b.textContent || '')));
            if (!btn) return false;
            btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            btn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            btn.click();
            return true;
        });
        if (!hovered) {
            errors.push('no se encontro el boton de rail "Productos"');
            return errors;
        }
        await sleep(1200);

        const flyout = await waitForStableFlyout(page);
        if (!flyout.visible) {
            errors.push('el flyout no se abrio en 1440px');
            return errors;
        }
        console.log(`  items en el flyout: [${flyout.items.join(' | ')}]`);
        if (!flyout.items.length) {
            errors.push('el flyout de Productos salio vacio (sin fallback a section.leaf)');
            return errors;
        }
        for (const label of expected) {
            if (!flyout.items.includes(label)) {
                errors.push(`falta "${label}" en el flyout de Productos`);
            }
        }
        if (flyout.items.length !== expected.length) {
            errors.push(
                `el flyout tiene ${flyout.items.length} items y se esperaban ${expected.length}: [${flyout.items.join(' | ')}]`
            );
        }
        if (flyout.groups.length) {
            errors.push(`se pintaron grupos en el flyout para items-hoja: [${flyout.groups.join(' | ')}]`);
        }
    } catch (e) {
        errors.push(`excepcion: ${e.message}`);
    } finally {
        await page.close();
    }
    return errors;
}

(async () => {
    console.log('=== CDP Productos DOM (D-41) ===');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const all = [];
    try {
        for (const [login, expected] of CASES) {
            all.push(...(await runCase(browser, login, expected)).map((e) => `[${login}] ${e}`));
            all.push(...(await runFlyoutCase(browser, login, expected)).map((e) => `[${login} flyout] ${e}`));
        }
    } finally {
        await browser.close();
    }
    if (all.length) {
        console.log('\nFALLO:');
        for (const e of all) console.log(`  ${e}`);
        process.exitCode = 1;
    } else {
        console.log('\nOK: la entrada Productos renderiza sus submenus como items navegables.');
    }
})();