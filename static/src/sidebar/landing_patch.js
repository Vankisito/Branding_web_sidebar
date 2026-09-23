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
        const app = menuService
            .getApps()
            .find((a) => a.xmlid === DASHBOARD_XMLID);
        const root = menuService.getMenu("root");
        const firstApp = root.children[0];
        if (app && firstApp !== app.id) {
            return menuService.selectMenu(app);
        }
        return super._loadDefaultApp(...arguments);
    },
});
