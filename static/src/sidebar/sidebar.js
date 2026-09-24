/** @odoo-module **/

import { Component, onWillStart, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { SwitchCompanyMenu } from "@web/webclient/switch_company_menu/switch_company_menu";

const BRAND_ICON = (name) =>
    `/erpico_web_sidebar/static/src/icons/${name}.svg`;
const SPRITE = (id) =>
    `/erpico_web_sidebar/static/src/icons/ui-sprite.svg#${id}`;

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
    static components = { SwitchCompanyMenu };
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
            fullscreenHidden: false,
        });
        this._onAppChanged = this._onAppChanged.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._openDrawer = this._openDrawer.bind(this);
        this._onUIUpdated = this._onUIUpdated.bind(this);

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
            const byXmlid = new Map(rail.map((a) => [a.xmlid, a]));
            this.state.railApps = APP_MAP.map(({ xmlid }) => byXmlid.get(xmlid)).filter(
                Boolean
            );
            this.state.otherApps = other;
            this.state.activeAppId = this._currentAppId();
            this.state.ready = true;
        });

        this.env.bus.addEventListener("erpico:open-drawer", this._openDrawer);
        this.env.bus.addEventListener("ACTION_MANAGER:UI-UPDATED", this._onUIUpdated);
        this._clearHoverTimer = null;
        onMounted(() => {
            window.addEventListener("keydown", this._onKeyDown, true);
        });
        onWillUnmount(() => {
            this.env.bus.removeEventListener("erpico:open-drawer", this._openDrawer);
            this.env.bus.removeEventListener("ACTION_MANAGER:UI-UPDATED", this._onUIUpdated);
            window.removeEventListener("keydown", this._onKeyDown, true);
            if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        });
    }

    _currentAppId() {
        const app = this.menuService.getCurrentApp();
        return app ? app.id : null;
    }

    _onAppChanged() {
        this.state.activeAppId = this._currentAppId();
    }

    _onUIUpdated(evt) {
        if (!this.state) return;
        const mode = evt && evt.detail;
        if (mode !== "new") {
            this.state.fullscreenHidden = mode === "fullscreen";
        }
    }

    _onKeyDown(ev) {
        if (ev.key === "Escape") {
            if (this.state.drawerOpen) {
                this._closeDrawer();
            } else if (this.state.allAppsOpen) {
                this.state.allAppsOpen = false;
                this._hoverLock = false;
            } else if (this.state.flyoutApp) {
                this.state.flyoutApp = null;
                this._hoverLock = false;
            }
        }
    }

    _openDrawer() {
        this.state.drawerOpen = true;
    }

    _closeDrawer() {
        this.state.drawerOpen = false;
        this.state.flyoutApp = null;
        this.state.allAppsOpen = false;
        this._hoverLock = false;
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
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
        this._hoverLock = false;
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this._open(this._resolveLeaf(app));
    }

    openItem(menu) {
        this._hoverLock = false;
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this._open(this._resolveLeaf(menu));
    }

    _open(leaf) {
        if (leaf) {
            this.menuService.selectMenu(leaf);
        }
        this.state.allAppsOpen = false;
        this.state.drawerOpen = false;
    }

    /** Ir a Ajustes (configuración general) */
    goToSettings() {
        const settingsApp = [...this.state.railApps, ...this.state.otherApps]
            .find(a => a.xmlid === "base.menu_administration");
        const leaf = settingsApp ? this._resolveLeaf(settingsApp) : undefined;
        if (leaf) {
            this.menuService.selectMenu(leaf);
        }
        this.state.drawerOpen = false;
    }

    _cancelHoverTimer() {
        if (this._clearHoverTimer) {
            clearTimeout(this._clearHoverTimer);
            this._clearHoverTimer = null;
        }
    }

    hoverApp(app) {
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this.state.flyoutApp = app;
    }

    clearHover() {
        this._clearHoverTimer = setTimeout(() => {
            if (!this._hoverLock) {
                this.state.flyoutApp = null;
            }
        }, 180);
    }

    _openFlyout(app) {
        this._hoverLock = true;
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this.state.flyoutApp = app;
    }

    _closeFlyout() {
        this._hoverLock = false;
        this.clearHover();
    }

    _onRailKeydown(app, ev) {
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
            ev.preventDefault();
            this._openFlyout(app);
        }
        if (ev.key === "Escape") {
            this._closeFlyout();
        }
    }

    toggleAllApps() {
        this._hoverLock = false;
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
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