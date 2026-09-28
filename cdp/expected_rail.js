/**
 * Especificacion INDEPENDIENTE del rail, para cdp/cdp_matrix.js.
 *
 * Por que este archivo existe y por que NO importa nav_entries.js: si la
 * expectativa se derivara del codigo bajo prueba, cambiar un NAV_MAP erroneo
 * cambiaria la expectativa y el test seguiria en verde. Este archivo es la
 * referencia escrita a mano; si se toca NAV_MAP hay que tocar este archivo, y
 * que la matriz se ponga roja es justamente la senal de que algo cambio.
 *
 * Cada entrada declara los mismos candidatos xmlid que NAV_MAP, en el mismo
 * orden. Para un usuario dado:
 *
 *   - la entrada DEBERIA renderizarse si al menos un xmlid de alguna de sus
 *     secciones esta en el payload de /web/webclient/load_menus;
 *   - y deberia resolver exactamente, por seccion, el PRIMER xmlid presente de
 *     la lista (es lo que hace pickMenu() en nav_entries.js).
 *
 * Ojo: esto no reemplaza al diagnostico de permisos del servidor. Si la BD no
 * filtra menus por grupos, la fixture no lo detecta; para eso esta
 * cdp/check_menu_leak.js.
 */
const EXPECTED_RAIL = [
    {
        id: "home",
        label: "Inicio",
        sections: [{ xmlids: ["erpico_web_sidebar.menu_home_root"] }],
    },
    {
        id: "crm",
        label: "CRM",
        sections: [{ xmlids: ["crm.crm_menu_root"] }],
    },
    {
        id: "ventas",
        label: "Ventas",
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
        sections: [{ xmlids: ["website_sale.menu_ecommerce"] }],
    },
    {
        id: "pos",
        label: "POS",
        sections: [{ xmlids: ["point_of_sale.menu_point_root"] }],
    },
    {
        id: "inventario",
        label: "Inventario",
        sections: [{ xmlids: ["stock.menu_stock_root"] }],
    },
    {
        id: "productos",
        label: "Productos",
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
        sections: [{ xmlids: ["purchase.menu_purchase_root"] }],
    },
    {
        id: "website",
        label: "Website",
        sections: [{ xmlids: ["website.menu_website_configuration"] }],
    },
    {
        id: "marketing",
        label: "Marketing - Email/SMS",
        sections: [
            { label: "Email Marketing", xmlids: ["mass_mailing.mass_mailing_menu_root"] },
            { label: "SMS Marketing", xmlids: ["mass_mailing_sms.mass_mailing_sms_menu_root"] },
        ],
    },
];

/** XMLID sentados por el servidor para este usuario. */
function payloadXmlids(payload) {
    return new Set(
        Object.values(payload)
            .filter((m) => m && m.xmlid)
            .map((m) => m.xmlid)
    );
}

/**
 * Entradas que el rail deberia mostrar para este payload, y con que xmlids.
 * Devuelve [{ id, label, xmlids: [...] }] en el orden de la fixture.
 */
function expectedRailFor(payload) {
    const sent = payloadXmlids(payload);
    const expected = [];
    for (const entry of EXPECTED_RAIL) {
        const xmlids = [];
        for (const section of entry.sections) {
            const first = section.xmlids.find((x) => sent.has(x));
            if (first) {
                xmlids.push(first);
            }
        }
        if (xmlids.length) {
            expected.push({ id: entry.id, label: entry.label, xmlids });
        }
    }
    return expected;
}

module.exports = { EXPECTED_RAIL, expectedRailFor, payloadXmlids };
