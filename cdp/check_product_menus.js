/**
 * Contrato de permisos de los submenús de Producto (D-41).
 *
 * Uso:  node check_product_menus.js [admin,ventas,basic]
 *
 * Para otra BD:  ODOO_URL=... ODOO_DB=mi_bd node check_product_menus.js
 *
 * Background: `erpico_web_sidebar_roles/security/product_menus.xml` suma al
 * `group_ids` de tres menus de producto ya existentes el grupo de usuario de
 * inventario (`stock.group_stock_user`), no el de manager. El sidebar solo
 * muestra lo que `/web/webclient/load_menus` devuelve, asi que el test va
 * contra ese endpoint y no contra el DOM.
 *
 * Expectaciones escritas a mano a partir de los grupos que cada usuario tiene
 * de verdad en la BD de QA (verificado con odoo shell), no autogeneradas:
 *
 *   admin  (uid 2)  -> todos los grupos user + todos los manager
 *   ventas  (uid 17) -> solo group_sale_salesman
 *   basic  (uid 18) -> group_sale_salesman, group_stock_user,
 *                      group_purchase_user, group_pos_user (ningun manager)
 *
 * `parent` importa tanto como `see`: un menu visible cuyo padre esta gateado a
 * manager queda huerfano. Se verifican los dos.
 *
 * Odoo 19 no expone ningun xmlid de menu en el modulo `product`; los destinos
 * de producto cuelgan de stock / sale / website_sale. Se eligieron los unicos
 * con cadena de ancestros que no pasa por Configuration:
 *
 *   stock.menu_product_variant_config_stock   ya visible, sin gate propio
 *   stock.product_product_menu                gate product.group_product_variant
 *   sale.menu_product_pricelist_main          gate product.group_product_pricelist
 *   website_sale.menu_product_attribute_action gate product.group_product_variant
 *
 * Categorias NO se incluye: en el core toda su cadena cuelga de
 * `stock.menu_stock_config_settings` (Configuration, gate
 * stock.group_stock_manager), y abrirlo exponeria toda la seccion. Se decidio
 * con el usuario omitirla en lugar de escalar privilegios. `notSee` lo fija
 * para que nadie la reintroduzca por la puerta de atras.
 *
 * Sale con codigo 1 si falla alguna asercion o si el recorrido de menus falla,
 * porque en ese caso el diagnostico no seria de fiar.
 */
const { BASE, DB_NAME, USERS } = require('./qa_config');

const SEE = [
    'stock.menu_product_variant_config_stock',
    'stock.product_product_menu',
    'sale.menu_product_pricelist_main',
    'website_sale.menu_product_attribute_action',
];

const PARENT_OF = {
    'stock.menu_product_variant_config_stock': 'stock.menu_stock_inventory_control',
    'stock.product_product_menu': 'stock.menu_stock_inventory_control',
    'sale.menu_product_pricelist_main': 'sale.product_menu_catalog',
    'website_sale.menu_product_attribute_action': 'website_sale.menu_catalog',
};

// Control de escalada: abrir los submenus de producto NO puede abrir
// Configuration de Inventario ni de Ventas.
const NO_DEBE_VERSE = [
    'stock.menu_stock_config_settings',
    'sale.menu_sale_config',
    'stock.menu_product_category_config_stock',
];

const EXPECT = {
    admin: { see: SEE, notSee: [] },
    // Sin group_stock_user no ve la rama de Inventario. Pero Listas de precios y
    // Atributos SI le salen, y no por este modulo: `ventas` ya traia
    // product.group_product_pricelist y product.group_product_variant, que son
    // los gates NATIVOS de esos dos menus (verificado con odoo shell). O sea que
    // un vendedor ya los veia en el core, y este modulo no cambia eso.
    ventas: {
        see: ['sale.menu_product_pricelist_main', 'website_sale.menu_product_attribute_action'],
        notSee: [
            'stock.menu_product_variant_config_stock',
            'stock.product_product_menu',
            'stock.menu_stock_config_settings',
            'sale.menu_sale_config',
            'stock.menu_product_category_config_stock',
        ],
    },
    basic: {
        see: SEE,
        notSee: ['stock.menu_stock_config_settings', 'sale.menu_sale_config', 'stock.menu_product_category_config_stock'],
    },
    // El caso que de verdad prueba security/product_menus.xml: tiene
    // stock.group_stock_user (via el rol Inventario ERPICO) pero NO
    // product.group_product_variant, que es el gate NATIVO de stock.product_product_menu.
    // Si el modulo no hiciera su trabajo, "Variantes" estaria ausente.
    //
    // Ve 2 de los 4 y es lo correcto: Listas de precios y Atributos cuelgan de
    // sale.product_menu_catalog y website_sale.menu_catalog, ambos gateados a
    // sales_team.group_sale_salesman. Abrir esos ancestros para forzar los 4
    // haria aparecer las apps Ventas y Website en el rail de un usuario que solo
    // tiene Inventario, que es justamente lo que `sale.sale_menu_root` ausente
    // verifica. El sidebar ya es responsivo a permisos por diseno (ver el
    // comentario de resolveEntries), asi que se respeta.
    inv: {
        see: [
            'stock.menu_product_variant_config_stock',
            'stock.product_product_menu',
        ],
        notSee: [
            'sale.menu_product_pricelist_main',
            'website_sale.menu_product_attribute_action',
            'stock.menu_stock_config_settings',
            'stock.menu_product_category_config_stock',
            'sale.menu_sale_config',
            // El rol de Inventario no implica Ventas: ningun menu de Ventas debe
            // aparecer. Comprueba que el modulo no arrastro al usuario a otra app.
            'sale.sale_menu_root',
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

// load_menus devuelve un dict plano id -> {xmlid, children[]}, ids como strings.
function ancestorsOf(menus, xmlid) {
    const parentOf = new Map();
    const xmlidOf = new Map();
    for (const node of Object.values(menus)) {
        if (node.xmlid) {
            xmlidOf.set(String(node.id), node.xmlid);
        }
        for (const child of node.children || []) {
            parentOf.set(String(child), String(node.id));
        }
    }
    const chain = [];
    let curId = [...xmlidOf.entries()].find(([, v]) => v === xmlid)[0];
    while (curId && parentOf.has(curId)) {
        curId = parentOf.get(curId);
        chain.push(xmlidOf.get(curId) || `id:${curId}`);
    }
    return chain;
}

(async () => {
    const order = (process.argv[2] || 'admin,ventas,basic,inv').split(',');
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
            const chain = ancestorsOf(result.menus, xmlid);
            const parent = PARENT_OF[xmlid];
            if (chain.includes(parent)) {
                console.log(`        ok     ${xmlid}  (bajo ${parent})`);
            } else {
                console.log(`        FALTA  ${xmlid} presente pero no cuelga de ${parent}`);
                console.log(`               cadena real: ${chain.join(' <- ') || '(raiz, huerfano)'}`);
                failed = true;
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
        console.log('FALLO: el gate de permisos de Producto no cumple el contrato.');
        process.exitCode = 1;
    } else {
        console.log('OK: submenus de Producto visibles para stock_user, Configuration sigue cerrada.');
    }
})();