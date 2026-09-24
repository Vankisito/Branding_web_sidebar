/** @odoo-module **/

// M3 (BUG-S-002 fix) — Landing → app Dashboards nativa (D-10).
// Patch a nivel de módulo: corre al cargar, antes de instancia de WebClient.
// Gate por PRESENCIA del menú Dashboards en getApps(): determinista, evita
// depender de user.hasGroup() (flaky en boot, groupCache sin hydrate).
// Usuario sin acceso a Dashboards → super() (primer app disponible).
import { WebClient } from "@web/webclient/webclient";
import { patch } from "@web/core/utils/patch";

const DASHBOARD_XMLID =
    "spreadsheet_dashboard.spreadsheet_dashboard_menu_root";

patch(WebClient.prototype, {
    async _loadDefaultApp() {
        const menuService = this.env.services.menu;
        const apps = menuService.getApps();
        const dashboardApp = apps.find(
            (a) => a.xmlid === DASHBOARD_XMLID
        );
        if (dashboardApp && apps[0].id !== dashboardApp.id) {
            return menuService.selectMenu(dashboardApp);
        }
        return super._loadDefaultApp(...arguments);
    },
});
