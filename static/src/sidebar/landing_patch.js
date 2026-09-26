/** @odoo-module **/

// D-33 — Landing.
// El menú root `erpico_web_sidebar.menu_home_root` tiene sequence=1, así que
// `menuService.getApps()` lo devuelve como apps[0] y el WebClient core ya
// aterriza ahí. Este patch queda sólo como red de seguridad: si el menú propio
// no estuviera disponible (módulo no instalado, caché de menús vieja) se cae
// al dashboard nativo y, en último caso, al comportamiento core.
import { WebClient } from "@web/webclient/webclient";
import { patch } from "@web/core/utils/patch";
import { DASHBOARD_MENU_XMLID, HOME_MENU_XMLID } from "./nav_entries";

function findApp(menuService, xmlid) {
    const app = menuService.getApps().find((candidate) => candidate.xmlid === xmlid);
    return app || null;
}

patch(WebClient.prototype, {
    async _loadDefaultApp() {
        const menuService = this.menuService || this.env.services.menu;
        const apps = menuService.getApps();

        // El home manda: si ya es la primera app, el core la abre solo; si no,
        // se selecciona explícitamente. Nunca se debe caer al dashboard cuando
        // el home está disponible.
        const home = findApp(menuService, HOME_MENU_XMLID);
        if (home) {
            if (apps[0]?.id === home.id) {
                return super._loadDefaultApp();
            }
            return menuService.selectMenu(home);
        }

        const dashboard = findApp(menuService, DASHBOARD_MENU_XMLID);
        if (dashboard && apps[0]?.id !== dashboard.id) {
            return menuService.selectMenu(dashboard);
        }
        return super._loadDefaultApp();
    },
});
