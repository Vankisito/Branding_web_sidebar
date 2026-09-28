/**
 * Diagnóstico del entorno: compara los menús que /web/webclient/load_menus
 * devuelve para cada usuario con los que debería devolver según sus grupos.
 *
 * Uso:  node check_menu_leak.js [admin,ventas,basic,basic,ventas,admin]
 *
 * Para otra BD:  ODOO_URL=... ODOO_DB=mi_bd node check_menu_leak.js
 *
 * Background: con los grupos de la 1.2.0 (sin `privilege_id` y mal seedados)
 * `ventas` y `basic` recibían exactamente el mismo set de 74 menús, porque el
 * seed les había dejado los mismos grupos. Con `erpico_web_sidebar_roles`
 * (1.3.0) y el seed correcto cada usuario recibe lo suyo: admin 259, ventas 74,
 * basic 34. Si vuelve a aparecer la fuga, el problema está en los grupos o en el
 * seed, no en el sidebar (que sólo muestra lo que el servidor le manda).
 *
 * Sale con codigo 1 si la autenticacion o el recorrido de menus falla, porque en
 * ese caso el diagnostico no seria de fiar.
 */
const { BASE, DB_NAME, USERS } = require('./qa_config');

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
    return {
        uid,
        xmlids: Object.values(menus)
            .filter((m) => Array.isArray(m.children) && m.xmlid)
            .map((m) => m.xmlid)
            .sort(),
    };
}

(async () => {
    const order = (process.argv[2] || 'admin,ventas,basic,basic,ventas,admin').split(',');
    const seen = new Map();
    let failed = false;
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
        console.log(`${login.padEnd(7)} ${String(result.xmlids.length).padStart(4)} menus (uid ${result.uid})`);
        if (seen.has(login)) {
            const same = JSON.stringify(seen.get(login)) === JSON.stringify(result.xmlids);
            console.log(`        repetido: ${same ? 'idéntico (OK)' : 'DIFIERENTE entre llamadas'}`);
        }
        seen.set(login, result.xmlids);
    }

    if (failed) {
        console.log('\nERROR: algún login no se pudo evaluar; el diagnóstico de fuga no es válido.');
        process.exitCode = 1;
        return;
    }

    const nonAdmin = [...seen.keys()].filter((l) => l !== 'admin');
    if (nonAdmin.length < 2) {
        // Con un solo usuario no-admin no hay nada que comparar: comparar un
        // set consigo mismo daria siempre "LEAK".
        console.log(`\nOK: se evaluaron ${nonAdmin.length} usuario(s) no-admin; hace falta al menos 2 para comparar.`);
        return;
    }
    const first = nonAdmin.map((l) => JSON.stringify(seen.get(l)));
    if (first.every((v) => v === first[0])) {
        console.log(`\nLEAK: ${nonAdmin.join(', ')} reciben el mismo set de menús.`);
        console.log('El filtrado por grupos no está funcionando en esta BD (ver cabecera del archivo).');
        process.exitCode = 1;
    } else {
        console.log('\nOK: cada usuario recibe un set de menús distinto.');
    }
})();
