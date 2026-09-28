/**
 * Configuración compartida de los scripts CDP (BUG-S-029).
 *
 * URL y credenciales vienen de variables de entorno. Los defaults apuntan a
 * una BD local desechable (docker compose.test.yml, puerto 8071): no hay
 * ningún secreto real en el repo, pero nada aquí debe apuntar a una instancia
 * real. Para otro entorno:
 *
 *   ODOO_URL=http://mi-odoo:8071 ODOO_USER=... ODOO_PASSWORD=... node cdp_smoke.js
 *
 * Ver cdp/README.md.
 */

const BASE = (process.env.ODOO_URL || 'http://localhost:8071').replace(/\/+$/, '');
const LOGIN_URL = `${BASE}/web/login`;
const ODOO_URL = `${BASE}/odoo`;
const ADMIN_USERNAME = process.env.ODOO_USER || 'admin';
const ADMIN_PASSWORD = process.env.ODOO_PASSWORD || 'admin';
// BD de QA. Necesaria para /web/session/authenticate (jsonrpc) y para correr
// cdp/seed_users.py; al apuntar a otro entorno hay que cambiar las dos cosas.
const DB_NAME = process.env.ODOO_DB || 'sidebar_test';

// uids verificados en la BD de QA (sidebar_test). Son expectativas del test, no
// secretos, pero se pueden overridear si la BD tiene otro seed.
const USERS = {
    admin: {
        u: ADMIN_USERNAME,
        p: ADMIN_PASSWORD,
        uid: Number(process.env.ODOO_UID_ADMIN || 2),
    },
    ventas: {
        u: process.env.ODOO_USER_VENTAS || 'ventas',
        p: process.env.ODOO_PASS_VENTAS || 'ventas',
        uid: Number(process.env.ODOO_UID_VENTAS || 17),
    },
    basic: {
        u: process.env.ODOO_USER_BASIC || 'basic',
        p: process.env.ODOO_PASS_BASIC || 'basic',
        uid: Number(process.env.ODOO_UID_BASIC || 18),
    },
};

module.exports = {
    BASE,
    LOGIN_URL,
    ODOO_URL,
    DB_NAME,
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    USERS,
};
