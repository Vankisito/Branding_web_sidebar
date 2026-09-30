/**
 * Contrato de permisos de los submenús de Reportes (D-40, C14/C15).
 *
 * Uso:  node check_report_menus.js [admin,ventas,basic]
 *
 * Para otra BD:  ODOO_URL=... ODOO_DB=mi_bd node check_report_menus.js
 *
 * Background: `erpico_web_sidebar_roles` suma al `group_ids` de los menús de
 * Reportes ya existentes el grupo de usuario de cada app (no el de manager), y
 * deja los wizards de POS en manager. Lauka de esto es que el gate nativo de
 * Odoo (`group_ids` de `ir_ui.menu`) es la unica fuente de verdad: el sidebar
 * solo muestra lo que `/web/webclient/load_menus` devuelve. Por eso el test va
 * contra ese endpoint y no contra el DOM.
 *
 * Las expectativas de abajo estan escritas a mano a partir de los grupos que
 * cada usuario tiene de verdad en la BD de QA (verificado con odoo shell), no
 * generadas desde el propio resultado -- si se autogeneraran, el test pasaria
 * siempre y no probaria nada:
 *
 *   admin  (uid 2)  -> todos los grupos user + todos los manager
 *   ventas  (uid 17) -> solo group_sale_salesman
 *   basic  (uid 18) -> group_sale_salesman, group_stock_user,
 *                      group_purchase_user, group_pos_user (ningun manager)
 *
 * `parent` importa tanto como `see`: un menu visible cuyo padre esta gateado a
 * manager queda huerfano y el usuario no lo puede alcanzar. Por eso el test
 * comprueba que el menu aparece colgando del padre esperado y no como raiz
 * suelta. Los padres son los del core, sin cambios de este modulo.
 *
 * Sale con codigo 1 si falla alguna asercion o si el recorrido de menus falla,
 * porque en ese caso el diagnostico no seria de fiar.
 */
const { BASE, DB_NAME, USERS } = require('./qa_config');

const REPORT_PARENTS = {
    'sale.menu_sale_report': 'sale.sale_menu_root',
    'stock.menu_warehouse_report': 'stock.menu_stock_root',
    'purchase.purchase_report_main': 'purchase.menu_purchase_root',
    'website_sale.menu_report_sales': 'website.menu_reporting',
    'point_of_sale.menu_report_pos_order_all': 'point_of_sale.menu_point_rep',
    'point_of_sale.menu_report_order_details': 'point_of_sale.menu_point_rep',
    'point_of_sale.menu_report_daily_details': 'point_of_sale.menu_point_rep',
};

// `see` y `notSee` son asserts duros. `notSee` incluye Configuration a proposito:
// es el control que demuestra que abrir Reportes no abrio Configuration.
const EXPECT = {
    admin: {
        see: [
            ...Object.keys(REPORT_PARENTS),
            'sale.menu_sale_config',
            'purchase.menu_purchase_config',
        ],
        notSee: [],
    },
    ventas: {
        see: ['sale.menu_sale_report', 'website_sale.menu_report_sales'],
        notSee: [
            'stock.menu_warehouse_report',
            'purchase.purchase_report_main',
            'point_of_sale.menu_report_pos_order_all',
            'point_of_sale.menu_report_order_details',
            'point_of_sale.menu_report_daily_details',
            'sale.menu_sale_config',
            'purchase.menu_purchase_config',
        ],
    },
    basic: {
        see: [
            'sale.menu_sale_report',
            'stock.menu_warehouse_report',
            'purchase.purchase_report_main',
            'website_sale.menu_report_sales',
            'point_of_sale.menu_report_pos_order_all',
        ],
        notSee: [
            'point_of_sale.menu_report_order_details',
            'point_of_sale.menu_report_daily_details',
            'sale.menu_sale_config',
            'purchase.menu_purchase_config',
        ],
    },
};

async function menusOf(login, password) {
    const auth = await fetch(`${BASE}/web/session/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { db: DB_NAME, login, password } }),
    });
    if (!auth.ok) {
        throw new Error(`authenticate de ${login} respondio ${auth.status}`);
    }
    const authBody = await auth.json();
    const uid = authBody && authBody.result && authBody.result.uid;
    if (!uid) {
        // Sin uid no hay sesion: seguir por aca daria el set de menus de la
        // sesion anterior (o de nadie) y un diagnostico falso.
        throw new Error(`autenticacion de ${login} fallo: ${JSON.stringify(authBody && authBody.error || authBody)}`);
    }
    const getSetCookie = auth.headers.getSetCookie
        || (typeof auth.headers.getCookie === 'function'
            ? (name) => { const c = auth.headers.getCookie(name); return c ? [c] : []; }
            : null);
    if (!getSetCookie) {
        throw new Error('la respuesta de authenticate no expone cookies (getSetCookie/getCookie no disponibles)');
    }
    const cookie = (getSetCookie.call(auth.headers) || []).map((c) => c.split(';')[0]).join('; ');
    if (!cookie) {
        throw new Error(`no se obtuvo cookie de sesion para ${login}`);
    }
    const res = await fetch(`${BASE}/web/webclient/load_menus?ts=${Date.now()}`, { headers: { cookie } });
    if (!res.ok) {
        throw new Error(`load_menus de ${login} respondio ${res.status}`);
    }
    const body = await res.json();
    const menus = body && body.result ? body.result : body;
    if (!menus || typeof menus !== 'object') {
        throw new Error(`load_menus de ${login} no devolvio un payload de menus: ${JSON.stringify(body).slice(0, 200)}`);
    }
    return { uid, menus };
}

// Reconstruye la cadena de ancestros desde las raices del payload. load_menus
// devuelve un dict plano id -> {xmlid, children[]}, y los ids son strings.
function ancestorsOf(menus, xmlid) {
    const byId = menus;
    const parentOf = new Map();
    for (const node of Object.values(byId)) {
        for (const child of node.children || []) {
            parentOf.set(String(child), String(node.id));
        }
    }
    const xmlidOf = new Map();
    for (const node of Object.values(byId)) {
        if (node.xmlid) {
            xmlidOf.set(String(node.id), node.xmlid);
        }
    }
    const chain = [];
    let cur = xmlidOf.get(xmlid);
    let curId = [...xmlidOf.entries()].find(([, v]) => v === xmlid)[0];
    while (curId && parentOf.has(curId)) {
        curId = parentOf.get(curId);
        cur = xmlidOf.get(curId);
        chain.push(cur || `id:${curId}`);
    }
    return chain;
}

(async () => {
    const order = (process.argv[2] || 'admin,ventas,basic').split(',');
    let failed = false;
    let checked = 0;

    for (const login of order) {
        const user = Object.values(USERS).find((u) => u.u === login);
        let result;
        try {
            result = await menusOf(login, user ? user.p : login);
        } catch (e) {
            console.log(`${login.padEnd(7)} ERROR ${e.message}`);
            failed = true;
            continue;
        }
        const present = new Set();
        for (const node of Object.values(result.menus)) {
            if (node.xmlid) {
                present.add(node.xmlid);
            }
        }
        const spec = EXPECT[login];
        console.log(`\n${login} (uid ${result.uid}) - ${present.size} menus en el payload`);
        if (!spec) {
            console.log('        sin expectativas escritas a mano; se omite');
            continue;
        }
        for (const xmlid of spec.see) {
            checked++;
            if (!present.has(xmlid)) {
                console.log(`        FALTA  ${xmlid}`);
                failed = true;
                continue;
            }
            const parent = REPORT_PARENTS[xmlid];
            if (parent) {
                const chain = ancestorsOf(result.menus, xmlid);
                if (chain.includes(parent)) {
                    console.log(`        ok     ${xmlid}  (bajo ${parent})`);
                } else {
                    console.log(`        FALTA  ${xmlid} esta presente pero no cuelga de ${parent}`);
                    console.log(`               cadena real: ${chain.join(' <- ') || '(raiz, huerfano)'}`);
                    failed = true;
                }
            } else {
                console.log(`        ok     ${xmlid}`);
            }
        }
        for (const xmlid of spec.notSee) {
            checked++;
            if (present.has(xmlid)) {
                console.log(`        SOBRA  ${xmlid}  (no deberia estar visible)`);
                failed = true;
            } else {
                console.log(`        ok     ${xmlid} ausente`);
            }
        }
    }

    console.log(`\n${checked} aserciones`);
    if (failed) {
        console.log('FALLO: el gate de permisos de Reportes no cumple el contrato.');
        process.exitCode = 1;
    } else {
        console.log('OK: Reportes visible para el usuario de cada app, Configuration y wizards de POS restricted.');
    }
})();