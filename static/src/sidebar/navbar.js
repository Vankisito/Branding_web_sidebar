/** @odoo-module **/

// M1 — ERPICO minimal topbar.
// Odoo 19 templates core no soportan inherit_id; se parchea el template del
// componente NavBar manteniendo su lógica (systray, adapt, handlers).
import { NavBar } from "@web/webclient/navbar/navbar";
import { patch } from "@web/core/utils/patch";

patch(NavBar, {
    template: "erpico_web_sidebar.NavBar",
});