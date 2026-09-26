/** @odoo-module **/

import { describe, expect, test } from "@odoo/hoot";
import {
    buildAppIcons,
    buildMenuIndex,
    resolveEntries,
    resolveHomeCards,
    resolveLeaf,
} from "@erpico_web_sidebar/static/src/sidebar/nav_entries";

function makeMenu(id, { xmlid, actionID, appID, children = [] } = {}) {
    return { id, xmlid, actionID, appID, children };
}

function makeService(menus) {
    const byId = new Map(menus.map((menu) => [menu.id, menu]));
    return {
        getAll: () => menus,
        getMenuAsTree(id) {
            const menu = byId.get(id);
            if (!menu.childrenTree) {
                menu.childrenTree = menu.children.map((cid) => this.getMenuAsTree(cid));
            }
            return menu;
        },
    };
}

describe("ERPICO sidebar — resolución de entradas por xmlid", () => {
    test("indexa los menús accesibles por xmlid", () => {
        const service = makeService([
            makeMenu(1, { xmlid: "crm.crm_menu_root", appID: 1 }),
            makeMenu(2, { xmlid: "stock.menu_stock_root", appID: 1 }),
        ]);
        const index = buildMenuIndex(service);
        expect(index.size).toBe(2);
        expect(index.get("crm.crm_menu_root").id).toBe(1);
    });

    test("respeta el orden de NAV_MAP y descarta entradas sin permiso", () => {
        const service = makeService([
            makeMenu(1, { xmlid: "erpico_web_sidebar.menu_home_root", appID: 1 }),
            makeMenu(2, { xmlid: "crm.crm_menu_root", appID: 2 }),
            // Sin POS: el usuario no tiene el grupo → no se renderiza
            makeMenu(3, { xmlid: "purchase.menu_purchase_root", appID: 3 }),
        ]);
        const entries = resolveEntries(service);
        expect(entries.map((e) => e.id)).toEqual(["home", "crm", "compras"]);
    });

    test("Ventas cae al xmlid candidato siguiente si el root está inactivo", () => {
        // Odoo 19 define `sale.sale_menu_root` con active="False": no llega a
        // getApps(), así que la entrada debe resolverse con el fallback.
        const service = makeService([
            makeMenu(1, { xmlid: "sale.menu_sale_order", actionID: 42, appID: 1 }),
        ]);
        const entries = resolveEntries(service);
        const ventas = entries.find((e) => e.id === "ventas");
        expect(ventas).toBeTruthy();
        expect(ventas.sections[0].menu.id).toBe(1);
    });

    test("Marketing agrupa Email y SMS, y oculta el grupo sin acceso", () => {
        const service = makeService([
            makeMenu(1, { xmlid: "mass_mailing.mass_mailing_menu_root", appID: 1 }),
        ]);
        const marketing = resolveEntries(service).find((e) => e.id === "marketing");
        expect(marketing.sections.length).toBe(1);
        expect(marketing.sections[0].label).toBe("Email Marketing");
    });

    test("appIds permiten marcar la entrada activa", () => {
        const service = makeService([
            makeMenu(1, { xmlid: "crm.crm_menu_root", appID: 7 }),
        ]);
        const crm = resolveEntries(service).find((e) => e.id === "crm");
        expect(crm.appIds).toEqual([7]);
    });
});

describe("ERPICO sidebar — resolveLeaf", () => {
    test("devuelve el propio menú si tiene acción", () => {
        const menu = makeMenu(1, { actionID: 10 });
        expect(resolveLeaf(menu, makeService([menu])).id).toBe(1);
    });

    test("desciende hasta la primera hoja con acción", () => {
        const leaf = makeMenu(3, { actionID: 33 });
        const service = makeService([
            makeMenu(1, { children: [2] }),
            makeMenu(2, { children: [3] }),
            leaf,
        ]);
        expect(resolveLeaf(service.getAll()[0], service).id).toBe(3);
    });

    test("devuelve null si no hay ninguna acción alcanzable", () => {
        const service = makeService([makeMenu(1)]);
        expect(resolveLeaf(service.getAll()[0], service)).toBe(null);
    });
});

describe("ERPICO sidebar — cards del home", () => {
    test("filtra las cards por permisos", () => {
        const service = makeService([
            makeMenu(1, {
                xmlid: "crm.crm_menu_root",
                actionID: 11,
                appID: 1,
            }),
        ]);
        const cards = resolveHomeCards(service);
        expect(cards.map((c) => c.id)).toEqual(["crm"]);
        expect(cards[0].leaf.id).toBe(1);
    });
});

describe("ERPICO sidebar — iconos de marca", () => {
    test("mapea los xmlids de las entradas a su icono", () => {
        const icons = buildAppIcons();
        expect(icons.get("crm.crm_menu_root").kind).toBe("img");
        expect(icons.get("website.menu_website_configuration").kind).toBe("sprite");
    });
});
