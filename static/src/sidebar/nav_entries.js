/** @odoo-module **/

// D-29/D-30 — Fuente única de verdad de la navegación ERPICO.
//
// El rail NO se construye sobre `menuService.getApps()` sino sobre entradas
// (NAV_MAP) que apuntan a MENÚS concretos mediante xmlid. Motivos (auditados
// contra odoo/odoo 19.0):
//
// - `/web/webclient/load_menus` ya filtra por grupos + active_test, así que la
//   PRESENCIA de un xmlid en `menuService.getAll()` es exactamente "el usuario
//   tiene permiso y el módulo está instalado" (mismo criterio que D-24).
// - `menuService.getMenu(id)` sólo acepta id numérico; no existe lookup por
//   xmlid, por lo que hay que indexar `getAll()`.
// - En Odoo 19 varias apps del jefe NO son app roots:
//     · `sale.sale_menu_root` se define con `active="False"` en
//       addons/sale/views/sale_menus.xml → no llega a `getApps()`.
//     · `product` no define ningún `<menuitem>`; Productos cuelga de
//       Inventario (`stock.menu_stock_inventory_control`).
//     · `website_sale.menu_ecommerce` es hijo de
//       `website.menu_website_configuration`.
//     · Email/SMS Marketing son dos apps distintas en Odoo 19.
//
// Por eso cada sección declara una lista de xmlids candidatos: gana el primero
// presente (fallback si el root está inactivo o cambia entre builds).

export const BRAND_ICON = (name) =>
    `/erpico_web_sidebar/static/src/icons/${name}.svg`;
export const SPRITE = (id) =>
    `/erpico_web_sidebar/static/src/icons/ui-sprite.svg#${id}`;

export const HOME_MENU_XMLID = "erpico_web_sidebar.menu_home_root";
export const SETTINGS_MENU_XMLID = "base.menu_administration";
export const DASHBOARD_MENU_XMLID =
    "spreadsheet_dashboard.spreadsheet_dashboard_menu_root";

/**
 * Orden del rail pedido por el cliente (2026-09-26).
 * `sections`: una entrada puede apuntar a varios menús (p.ej. Marketing
 * Email/SMS). Cada sección tiene su propio grupo en el flyout y sus propios
 * xmlids candidatos.
 */
export const NAV_MAP = [
    {
        id: "home",
        label: "Inicio",
        icon: { kind: "sprite", src: SPRITE("i-dashboard") },
        sections: [{ xmlids: [HOME_MENU_XMLID] }],
    },
    {
        id: "crm",
        label: "CRM",
        icon: { kind: "img", src: BRAND_ICON("brand-clientes-reportes") },
        sections: [{ xmlids: ["crm.crm_menu_root"] }],
    },
    {
        id: "ventas",
        label: "Ventas",
        icon: { kind: "img", src: BRAND_ICON("brand-pedidos-devoluciones") },
        sections: [
            {
                xmlids: [
                    "sale.sale_menu_root",
                    "sale.menu_sale_order",
                    "sale.menu_sale_quotations",
                ],
            },
        ],
    },
    {
        id: "ecommerce",
        label: "Ecommerce",
        icon: { kind: "img", src: BRAND_ICON("brand-ecommerce-integrado") },
        sections: [{ xmlids: ["website_sale.menu_ecommerce"] }],
    },
    {
        id: "pos",
        label: "POS",
        icon: { kind: "img", src: BRAND_ICON("brand-punto-de-venta") },
        sections: [{ xmlids: ["point_of_sale.menu_point_root"] }],
    },
    {
        id: "inventario",
        label: "Inventario",
        icon: { kind: "img", src: BRAND_ICON("brand-inventario-ubicacion") },
        sections: [{ xmlids: ["stock.menu_stock_root"] }],
    },
    {
        id: "productos",
        label: "Productos",
        icon: { kind: "img", src: BRAND_ICON("brand-productos") },
        sections: [
            {
                xmlids: [
                    "stock.menu_product_variant_config_stock",
                    "stock.menu_stock_inventory_control",
                ],
            },
        ],
    },
    {
        id: "compras",
        label: "Compras",
        icon: { kind: "img", src: BRAND_ICON("brand-compras") },
        sections: [{ xmlids: ["purchase.menu_purchase_root"] }],
    },
    {
        id: "website",
        label: "Website",
        icon: { kind: "sprite", src: SPRITE("i-globe") },
        sections: [{ xmlids: ["website.menu_website_configuration"] }],
    },
    {
        id: "marketing",
        label: "Marketing - Email/SMS",
        icon: { kind: "img", src: BRAND_ICON("brand-email-marketing") },
        sections: [
            {
                label: "Email Marketing",
                xmlids: ["mass_mailing.mass_mailing_menu_root"],
            },
            {
                label: "SMS Marketing",
                xmlids: ["mass_mailing_sms.mass_mailing_sms_menu_root"],
            },
        ],
    },
];

/**
 * Cards del home. Solo se implementan las 2 primeras opciones (D-33); la lista
 * es data para que crecer sea añadir un objeto.
 */
export const HOME_CARDS = [
    {
        id: "dashboards",
        title: "Dashboards",
        subtitle: "Indicadores y tableros del equipo",
        icon: { kind: "sprite", src: SPRITE("i-dashboard") },
        xmlids: [DASHBOARD_MENU_XMLID],
    },
    {
        id: "crm",
        title: "CRM",
        subtitle: "Clientes, oportunidades y seguimientos",
        icon: { kind: "img", src: BRAND_ICON("brand-clientes-reportes") },
        xmlids: ["crm.crm_menu_root"],
    },
];

/** Índice xmlid → menú sobre los menús accesibles al usuario. */
export function buildMenuIndex(menuService) {
    const index = new Map();
    for (const menu of menuService.getAll()) {
        if (menu.xmlid && !index.has(menu.xmlid)) {
            index.set(menu.xmlid, menu);
        }
    }
    return index;
}

/**
 * Nodo accionable: el propio menú si tiene acción, si no la primera hoja
 * alcanzable en profundidad.
 */
export function resolveLeaf(menu, menuService) {
    if (!menu) {
        return null;
    }
    if (menu.actionID) {
        return menu;
    }
    for (const child of menuService.getMenuAsTree(menu.id).childrenTree) {
        const leaf = resolveLeaf(child, menuService);
        if (leaf) {
            return leaf;
        }
    }
    return null;
}

/** Primer xmlid presente de la lista de candidatos. */
function pickMenu(section, index) {
    for (const xmlid of section.xmlids) {
        const menu = index.get(xmlid);
        if (menu) {
            return menu;
        }
    }
    return null;
}

/**
 * Resuelve NAV_MAP contra los menús accesibles. Una entrada sin ninguna
 * sección resoluble NO se renderiza (ni en rail, ni drawer, ni all-apps, ni
 * home) → sidebar responsivo a permisos.
 */
export function resolveEntries(menuService, index) {
    const menuIndex = index || buildMenuIndex(menuService);
    const entries = [];
    for (const def of NAV_MAP) {
        const sections = [];
        for (const section of def.sections) {
            const menu = pickMenu(section, menuIndex);
            if (!menu) {
                continue;
            }
            sections.push({
                label: section.label || def.label,
                menu,
                childrenTree: menuService.getMenuAsTree(menu.id).childrenTree,
                leaf: resolveLeaf(menu, menuService),
            });
        }
        if (!sections.length) {
            continue;
        }
        entries.push({
            id: def.id,
            label: def.label,
            icon: def.icon,
            sections,
            appIds: sections.map((section) => section.menu.appID),
        });
    }
    return entries;
}

/** Resuelve las cards del home con la misma lógica de permisos que el rail. */
export function resolveHomeCards(menuService, index) {
    const menuIndex = index || buildMenuIndex(menuService);
    const cards = [];
    for (const def of HOME_CARDS) {
        const menu = pickMenu(def, menuIndex);
        if (!menu) {
            continue;
        }
        cards.push({
            id: def.id,
            title: def.title,
            subtitle: def.subtitle,
            icon: def.icon,
            menu,
            leaf: resolveLeaf(menu, menuService),
        });
    }
    return cards;
}

/** Iconos de marca por xmlid, para el panel "Todas las aplicaciones". */
export function buildAppIcons() {
    const icons = new Map();
    for (const def of NAV_MAP) {
        for (const section of def.sections) {
            for (const xmlid of section.xmlids) {
                if (!icons.has(xmlid)) {
                    icons.set(xmlid, def.icon);
                }
            }
        }
    }
    return icons;
}
