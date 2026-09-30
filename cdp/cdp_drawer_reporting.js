/**
 * Drawer móvil: rama recursiva de `erpico_web_sidebar.DrawerMenu` con un usuario
 * que sí tiene submenús de Reportes (D-40 / D-13 / C15).
 *
 * Uso:  node cdp_drawer_reporting.js
 *
 * Para otra BD:  ODOO_URL=... ODOO_USER_BASIC=... ODOO_PASS_BASIC=... node cdp_drawer_reporting.js
 *
 * Por qué este script existe: `cdp_drawer.js` y `cdp_drawer_nav.js` corren como
 * admin, y en el seed de QA el admin no produce ninguna rama anidada de Reportes
 * bajo las apps que comprueba. O sea, la parte recursiva del template quedaba
 * sin ejercitar: si OWL no compartiera el contexto entre `t-call`, o si
 * `activeId` no estuviera declarado en el nivel anidado, el template compilaría
 * con un identificador inexistente y el drawer se dibujaría vacío -- sin que
 * ningún test verde lo notara.
 *
 * Se corre como `basic` porque es el usuario que tiene los grupos de usuario de
 * Ventas, Inventario, Compras y POS a la vez (esperado por `expected_rail.js`),
 * de modo que Reportes aparece en varias apps y se puede comprobar que la
 * recursión no depende de una app concreta.
 *
 * Lo que se verifica:
 *   - algún grupo "Reportes" anidado existe (la rama recursiva renderiza);
 *   - cuelga de un `li.o_erpico_drawer_group_item` de verdad (no aplanado);
 *   - sus hojas son alcanzables y navegables;
 *   - "Configuración" NO aparece (el gate de permisos se ve en la UI);
 *   - cero errores de consola, que es lo que delata un QWeb roto.
 *
 * Dos detalles que costaron un rato y conviene no volver a descubrir:
 *
 * 1. Los clicks van por `element.click()` dentro de la pagina, no por
 *    `page.click()`. El toggle vive en `.o_main_navbar` con `rect.y === 0`, y a
 *    375px el click por coordenadas de Puppeteer no lo alcanza (se comprobo que
 *    el evento no llega ni a fase capture del document) aunque
 *    `elementFromPoint` devuelva el propio boton. Con `element.click()` el
 *    handler de OWL se ejecuta igual, que es lo que importa. Se verifico que
 *    el drawer SI abre con `basic` de esa forma, o sea que el fallo era del
 *    mecanismo de click y no del modulo.
 *
 * 2. El sidebar rotula la seccion "Reportes" (espanol), no "Reporting" como se
 *    llama el nodo en el core. Buscar el nombre del core hacia que el test
 *    falle por una cadena mal escrita en vez de por el comportamiento.
 */
const puppeteer = require('puppeteer');

const { LOGIN_URL, ODOO_URL, USERS } = require('./qa_config');

const BASIC = USERS.basic;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Devuelve, por app, el arbol de grupos/hojas tal como queda en el DOM. Se
// evalua en el navegador para no arrastrar Selectors complexes por Puppeteer.
function readDrawerTree() {
    const apps = [];
    document.querySelectorAll('.o_erpico_drawer_app').forEach((app) => {
        const label = app.querySelector('.o_erpico_drawer_app_btn span');
        const walk = (ul, depth) => {
            const out = [];
            ul.querySelectorAll(':scope > li').forEach((li) => {
                const group = li.querySelector(':scope > .o_erpico_drawer_subgroup');
                const sub = li.querySelector(':scope > ul.o_erpico_drawer_sub');
                if (group) {
                    out.push({ type: 'group', name: group.textContent.trim(), depth, children: sub ? walk(sub, depth + 1) : [] });
                } else {
                    out.push({ type: 'leaf', name: li.textContent.trim(), depth, active: li.classList.contains('o_active') });
                }
            });
            return out;
        };
        apps.push({
            app: label ? label.textContent.trim() : '(sin label)',
            sections: Array.from(app.querySelectorAll(':scope > ul.o_erpico_drawer_sub')).map((ul) => walk(ul, 1)),
        });
    });
    return apps;
}

// `sections` viene como array de arrays (uno por `ul` raiz de la seccion), asi
// que hay que aplanar cada seccion antes de recorrer: pasar el array de arrays
// directo a `flatten` empuja los arrays sin descender y `name` queda undefined.
function flatten(nodes, acc) {
    for (const n of nodes) {
        acc.push(n);
        if (n.children) flatten(n.children, acc);
    }
    return acc;
}

// El drawer se puebla desde `menuService` de forma asincrona: si se lee el DOM
// justo despues del click, `entry.sections` puede seguir a medio resolver y cada
// app aparece colapsada a una sola hoja (que es justo el sintoma que este test
// busca). Se espera a que el conteo de nodos se estabilice en dos muestras
// seguidas en lugar de dormir un tiempo fijo: con 1200 ms daba falso negativo y
// con 1500 ms daba bien, o sea que el margen depende de la carga.
async function waitForStableDrawer(page, timeoutMs = 15000) {
    const sample = () => page.evaluate(() => {
        const d = document.querySelector('.o_erpico_drawer');
        if (!d) return -1;
        return d.querySelectorAll('.o_erpico_drawer_sub li').length;
    });
    const deadline = Date.now() + timeoutMs;
    let prev = await sample();
    while (Date.now() < deadline) {
        await sleep(300);
        const now = await sample();
        if (now > 0 && now === prev) return now;
        prev = now;
    }
    return prev;
}

(async () => {
    console.log('=== CDP Drawer Reporting Test (D-40, rama recursiva) ===');
    console.log(`Usuario: ${BASIC.u} (uid ${BASIC.uid})`);
    console.log('');

    const errors = [];
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=375,667'],
    });
    const page = await browser.newPage();
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    try {
        await page.setViewport({ width: 375, height: 667 });
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });
        await sleep(1500);
        await page.waitForSelector('#login', { timeout: 10000 });
        await page.type('#login', BASIC.u);
        await page.type('#password', BASIC.p);
        await page.click('button.btn-primary[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
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

        const settled = await waitForStableDrawer(page);
        if (settled <= 0) {
            errors.push(`el drawer no estabilizo con contenido (nodos=${settled})`);
        }

        const drawer = await page.$('.o_erpico_drawer');
        if (!drawer) {
            errors.push('el drawer no se abrio en 375px');
        } else {
            console.log('[R1] Drawer abierto en 375px: OK');
        }

        const apps = await page.evaluate(readDrawerTree);
        const reportApps = [];
        for (const a of apps) {
            const nodes = a.sections.flatMap((section) => flatten(section, []));
            const groups = nodes.filter((n) => n.type === 'group');
            const reporting = groups.filter((n) => n.name === 'Reportes');
            const all = nodes.map((n) => n.name);
            console.log(`  ${a.app.padEnd(14)} hojas=${String(all.length).padStart(3)} grupos=[${groups.map((g) => `${g.name}@d${g.depth}`).join(', ')}]`);
            if (reporting.length) {
                reportApps.push({ app: a.app, reporting });
            }
            if (all.includes('Configuración')) {
                errors.push(`${a.app}: "Configuración" aparece en el drawer de un usuario sin grupo manager`);
            }
        }

        console.log('');
        if (!reportApps.length) {
            errors.push('ninguna app muestra un grupo "Reportes" anidado: la rama recursiva no renderizo');
        } else {
            console.log(`[R2] Grupos "Reportes" anidados en ${reportApps.length} app(s): ${reportApps.map((r) => r.app).join(', ')}: OK`);
        }

        // Lo que prueba que la recursion funciona (y no una copia de un nivel) es
        // que exista un `ul.o_erpico_drawer_sub` DENTRO de otro, o sea un grupo de
        // depth >= 2: eso solo lo puede producir el `t-call` recursivo. Un grupo a
        // depth 1 ya es un grupo anidado, porque el `ul` de la seccion es el
        // nivel 1 y sus hijos son nivel 2.
        const allGroups = [];
        for (const a of apps) {
            for (const sec of a.sections) flatten(sec, []).forEach((n) => { if (n.type === 'group') allGroups.push({ app: a.app, ...n }); });
        }
        const deepGroups = allGroups.filter((g) => g.depth >= 2);
        if (!deepGroups.length) {
            errors.push('no hay ningun grupo a depth >= 2: el template no esta recursivo (todo seria un solo nivel)');
        } else {
            console.log(`[R3a] Grupos anidados a depth >= 2: ${deepGroups.length} (p.ej. ${deepGroups[0].app}: ${deepGroups[0].name}): OK`);
        }

        const withLeaves = reportApps.filter((r) => r.reporting.some((g) => g.children.length));
        if (!withLeaves.length) {
            errors.push('los grupos "Reportes" no tienen hojas debajo: no hay nada que abrir');
        } else {
            const sample = withLeaves[0];
            console.log(`[R4] Hojas bajo "Reportes" en ${sample.app}: ${sample.reporting.flatMap((g) => g.children.map((c) => c.name)).join(', ')}`);
        }

        // Navegar a una hoja bajo "Reportes": prueba de que la rama recursiva es
        // interactiva y que el reporte se abre de verdad, no solo que se dibuja.
        const target = await page.evaluate(() => {
            const sub = Array.from(document.querySelectorAll('.o_erpico_drawer_group_item'))
                .find((li) => {
                    const g = li.querySelector(':scope > .o_erpico_drawer_subgroup');
                    return g && g.textContent.trim() === 'Reportes';
                });
            const ul = sub && sub.querySelector(':scope > ul.o_erpico_drawer_sub');
            const leaf = ul && ul.querySelector(':scope > li:not(.o_erpico_drawer_group_item)');
            if (!leaf) return null;
            leaf.setAttribute('data-qa-nested-leaf', '1');
            return leaf.textContent.trim();
        });
        if (!target) {
            errors.push('no se encontro una hoja clickeable bajo un grupo "Reportes" del drawer');
        } else {
            console.log(`[R5] Hoja bajo "Reportes" a navegar: "${target}"`);
            const before = page.url();
            await page.evaluate(() => document.querySelector('[data-qa-nested-leaf="1"]').click());
            await sleep(2500);
            const after = page.url();
            const drawerClosed = await page.evaluate(() => {
                const d = document.querySelector('.o_erpico_drawer');
                return !d || d.offsetParent === null;
            });
            console.log(`[R6] Navego: ${before !== after ? 'SI' : 'NO (url sin cambio)'}`);
            console.log(`[R7] Drawer cerro al navegar: ${drawerClosed ? 'SI (OK)' : 'NO (BUG-S-013)'}`);
            if (before === after) errors.push(`la hoja anidada "${target}" no navego: la url no cambio`);
            if (!drawerClosed) errors.push('BUG-S-013: el drawer no cerro al navegar una hoja anidada');
        }

        console.log('');
        console.log('=== Resumen Drawer Reporting ===');
        if (!errors.length) {
            console.log('OK: la rama recursiva renderiza, anida y navega; Configuración sigue oculta.');
        } else {
            console.log(`FALLO: ${errors.length} problema(s):`);
            errors.forEach((e) => console.log(`  - ${e}`));
        }
    } catch (e) {
        errors.push(e.message);
        console.log(`  ERROR ${e.message}`);
    }

    await browser.close();
    if (errors.length) process.exitCode = 1;
})();