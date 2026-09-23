/** @odoo-module **/

import { Component, onWillStart, useState, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const BRAND_ICON = (name) =>
    `/erpico_web_sidebar/static/src/icons/${name}.svg`;
const SPRITE = (id) =>
    `/erpico_web_sidebar/static/src/icons/ui-sprite.svg#${id}`;

/**
 * D-12: orden y branding por app (raíz de menús Odoo 19 válida).
 * `kind: img`  -> <img src>  (SVG marca ERPICO)
 * `kind: sprite` -> <svg><use> (ui-sprite, símbolos UI)
 * XMLIDs verificados contra dump runtime de `menuService.getApps()`.
 */
export const APP_MAP = [
    { xmlid: "spreadsheet_dashboard.spreadsheet_dashboard_menu_root", icon: { kind: "sprite", src: SPRITE("i-dashboard") } },
    { xmlid: "contacts.menu_contacts", icon: { kind: "sprite", src: SPRITE("i-building") } },
    { xmlid: "crm.crm_menu_root", icon: { kind: "img", src: BRAND_ICON("brand-clientes-reportes") } },
    { xmlid: "sale.sale_menu_root", icon: { kind: "img", src: BRAND_ICON("brand-pedidos-devoluciones") } },
    { xmlid: "point_of_sale.menu_point_root", icon: { kind: "img", src: BRAND_ICON("brand-punto-de-venta") } },
    { xmlid: "purchase.menu_purchase_root", icon: { kind: "img", src: BRAND_ICON("brand-compras") } },
    { xmlid: "account.menu_finance", icon: { kind: "img", src: BRAND_ICON("brand-facturacion") } },
    { xmlid: "stock.menu_stock_root", icon: { kind: "img", src: BRAND_ICON("brand-inventario-ubicacion") } },
    { xmlid: "website.menu_website_configuration", icon: { kind: "sprite", src: SPRITE("i-globe") } },
    { xmlid: "website_sale.menu_ecommerce", icon: { kind: "img", src: BRAND_ICON("brand-ecommerce-integrado") } },
    { xmlid: "mail.menu_root_discuss", icon: { kind: "sprite", src: SPRITE("i-bell") } },
    { xmlid: "calendar.mail_menu_calendar", icon: { kind: "sprite", src: SPRITE("i-calendar") } },
    { xmlid: "base.menu_administration", icon: { kind: "sprite", src: SPRITE("i-settings") } },
];

export class Sidebar extends Component {
    static template = "erpico_web_sidebar.Sidebar";
    static props = {};

    setup() {
        this.menuService = useService("menu");
        this.ui = useService("ui");
        this.state = useState({
            ready: false,
            railApps: [],
            otherApps: [],
            activeAppId: null,
            flyoutApp: null,
            allAppsOpen: false,
            drawerOpen: false,
        });
        this._onAppChanged = this._onAppChanged.bind(this);

        onWillStart(async () => {
            const apps = this.menuService.getApps();
            const iconsByXmlid = new Map(
                APP_MAP.map(({ xmlid, icon }) => [xmlid, icon])
            );
            const rail = [];
            const other = [];
            for (const app of apps) {
                const childrenTree =
                    this.menuService.getMenuAsTree(app.id).childrenTree;
                app._childrenTree = childrenTree;
                app._icon =
                    iconsByXmlid.get(app.xmlid) ||
                    (app.webIconData
                        ? { kind: "img", src: app.webIconData }
                        : { kind: "sprite", src: SPRITE("i-grid") });
                const mapped = iconsByXmlid.has(app.xmlid) ? rail : other;
                mapped.push(app);
            }
            // rail: orden del APP_MAP (los encontrados)
            const byXmlid = new Map(rail.map((a) => [a.xmlid, a]));
            this.state.railApps = APP_MAP.map(({ xmlid }) => byXmlid.get(xmlid)).filter(
                Boolean
            );
            this.state.otherApps = other;
            this.state.activeAppId = this._currentAppId();
            this.state.ready = true;
        });

        this.env.bus.addEventListener("MENUS:APP-CHANGED", this._onAppChanged);
    }

    _currentAppId() {
        const app = this.menuService.getCurrentApp();
        return app ? app.id : null;
    }

    _onAppChanged() {
        this.state.activeAppId = this._currentAppId();
    }

    /** Nodo accionable: raíz con acción o primer hoja del árbol. */
    _resolveLeaf(menu) {
        if (!menu) {
            return menu;
        }
        if (menu.actionID) {
            return menu;
        }
        const children =
            menu._childrenTree || this.menuService.getMenuAsTree(menu.id).childrenTree;
        for (const child of children) {
            const leaf = this._resolveLeaf(child);
            if (leaf) {
                return leaf;
            }
        }
        return undefined;
    }

    selectApp(app) {
        this._open(this._resolveLeaf(app));
    }

    openItem(menu) {
        this._open(this._resolveLeaf(menu));
    }

    _open(leaf) {
        if (leaf) {
            this.menuService.selectMenu(leaf);
        }
        this.state.allAppsOpen = false;
    }

    toggleDrawer() {
        this.state.drawerOpen = !this.state.drawerOpen;
        this.env.bus.trigger("erpico:open-drawer");
    }

    /** Ir a Ajustes (configuración general) */
    goToSettings() {
        const settingsMenu = this.menuService.getMenu("base.menu_administration");
        const leaf = settingsMenu ? this._resolveLeaf(settingsMenu) : undefined;
        if (leaf) {
            this.menuService.selectMenu(leaf);
        }
        this.state.drawerOpen = false;
    }

    /** Ir a Cambiar de empresa */
    goToCompany() {
        const action = this.env.services.action;
        action.doAction("base.action_res_companies");
        this.state.drawerOpen = false;
    }

    hoverApp(app) {
        this.state.flyoutApp = app;
    }

    clearHover() {
        this.state.flyoutApp = null;
    }

    toggleAllApps() {
        this.state.allAppsOpen = !this.state.allAppsOpen;
    }

    get allAppsList() {
        return [...this.state.railApps, ...this.state.otherApps];
    }
}

registry.category("main_components").add("erpico_web_sidebar.Sidebar", {
    Component: Sidebar,
    props: {},
});