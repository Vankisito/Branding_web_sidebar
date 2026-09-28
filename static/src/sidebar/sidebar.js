/** @odoo-module **/

import { Component, onWillStart, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { SwitchCompanyMenu } from "@web/webclient/switch_company_menu/switch_company_menu";
import {
    buildAppIcons,
    buildMenuIndex,
    resolveEntries,
    resolveLeaf,
    SETTINGS_MENU_XMLID,
    SPRITE,
} from "./nav_entries";

export class Sidebar extends Component {
    static template = "erpico_web_sidebar.Sidebar";
    static components = { SwitchCompanyMenu };
    static props = {};

    setup() {
        this.menuService = useService("menu");
        this.ui = useService("ui");
        try {
            this.webclient = useService("webclient");
        } catch {
            this.webclient = null;
        }
        this.state = useState({
            ready: false,
            entries: [],
            otherApps: [],
            activeAppId: null,
            flyoutEntry: null,
            allAppsOpen: false,
            drawerOpen: false,
            fullscreenHidden: false,
        });
        this._pointerInFlyout = false;
        this._onKeyDown = this._onKeyDown.bind(this);
        this._openDrawer = this._openDrawer.bind(this);
        this._onUIUpdated = this._onUIUpdated.bind(this);
        this._onMenusChanged = this._onMenusChanged.bind(this);

        onWillStart(() => {
            this._resolveNavigation();
            this.state.ready = true;
        });

        // Los listeners se registran en setup(), es decir durante la
        // construcción: setear `state.drawerOpen` ahí es válido aunque el
        // componente todavía no esté montado, así que no hace falta ningún
        // estado "pending" para el primer clic.
        this.env.bus.addEventListener("erpico:open-drawer", this._openDrawer);
        this.env.bus.addEventListener("ACTION_MANAGER:UI-UPDATED", this._onUIUpdated);
        // MENUS:APP-CHANGED: el servicio de menús reemplaza su payload cuando
        // refresca desde el servidor (arranca desde localStorage en menu_service.js
        // y lo reconcilia después) y también en menuService.reload(). Core
        // re-renderiza la topbar en ese evento; el rail tiene que rehacer lo
        // mismo o queda mostrando los menús de la sesión anterior.
        this.env.bus.addEventListener("MENUS:APP-CHANGED", this._onMenusChanged);
        this._clearHoverTimer = null;
        onMounted(() => {
            window.addEventListener("keydown", this._onKeyDown, true);
            this._syncFullscreen();
        });
        onWillUnmount(() => {
            this.env.bus.removeEventListener("erpico:open-drawer", this._openDrawer);
            this.env.bus.removeEventListener("ACTION_MANAGER:UI-UPDATED", this._onUIUpdated);
            this.env.bus.removeEventListener("MENUS:APP-CHANGED", this._onMenusChanged);
            window.removeEventListener("keydown", this._onKeyDown, true);
            if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        });
    }

    /**
     * Re-resuelve el rail y el panel de apps contra los menús que el servicio
     * tiene cargados ahora. Es idempotente: se llama al arrancar y cada vez que
     * el servicio de menús reemplaza su payload.
     */
    _resolveNavigation() {
        // D-30: el índice se construye sobre getAll() porque getMenu() sólo
        // acepta id numérico. Los menús ausentes = sin permiso o módulo no
        // instalado → la entrada no se renderiza.
        this._menuIndex = buildMenuIndex(this.menuService);
        this._appIcons = buildAppIcons();
        this._appIconById = new Map();
        for (const app of this.menuService.getApps()) {
            this._appIconById.set(app.id, this._iconFor(app));
        }
        this.state.entries = resolveEntries(this.menuService, this._menuIndex);
        this.state.otherApps = this.menuService.getApps();
        this.state.activeAppId = this._currentAppId();
        // El flyout puede estar mostrando una entrada que ya no es resoluble.
        if (this.state.flyoutEntry && !this.state.entries.some((e) => e.id === this.state.flyoutEntry.id)) {
            this.state.flyoutEntry = null;
        }
    }

    _onMenusChanged() {
        this._resolveNavigation();
    }

    _iconFor(app) {
        const byXmlid = this._appIcons || (this._appIcons = buildAppIcons());
        return (
            byXmlid.get(app.xmlid) ||
            (app.webIconData
                ? { kind: "img", src: app.webIconData }
                : { kind: "sprite", src: SPRITE("i-grid") })
        );
    }

    /** Icono cacheado de una app del panel "Todas las aplicaciones". */
    iconFor(app) {
        return this._appIconById.get(app.id) || this._iconFor(app);
    }

    _currentAppId() {
        const app = this.menuService.getCurrentApp();
        return app ? app.id : null;
    }

    isEntryActive(entry) {
        return entry.appIds.includes(this.state.activeAppId);
    }

    /**
     * XMLID de cada sección resuelta de una entrada. Se expone en el DOM
     * (data-xmlids) para que la matriz QA pueda comprobar que el rail apunta al
     * menú que corresponde y no sólo que la etiqueta esté bien.
     */
    xmlidsOf(entry) {
        return entry.sections.map((section) => section.menu.xmlid).join(",");
    }

    /**
     * Estado de fullscreen al montar. El WebClient arranca siempre fuera de
     * fullscreen, pero se lee una vez por si acaso (patrón de BUG-S-034).
     * No hace falta ningún bucle de sincronización: ver _onUIUpdated.
     */
    _syncFullscreen() {
        if (this.webclient?.state?.fullscreen !== undefined) {
            this.state.fullscreenHidden = !!this.webclient.state.fullscreen;
        }
    }

    _onUIUpdated(evt) {
        if (!this.state) return;
        // El estado se deriva del propio evento, no de `webclient.state`, para
        // no depender del orden de listeners (el core muta ese state en su
        // propio handler del mismo evento). El bucle de requestAnimationFrame
        // que se usó para BUG-S-034 no hacía falta: `webclient.state.fullscreen`
        // sólo se escribe desde este mismo evento, así que esperarlo a él es
        // exactamente igual de inmediato. Con `mode === "new"` la acción ya no
        // es fullscreen, aunque el core mantenga su state previo.
        const mode = evt && evt.detail;
        this.state.fullscreenHidden = mode === "fullscreen";
        // Highlight de la entrada activa tras cualquier navegación
        this.state.activeAppId = this._currentAppId();
    }

    _onKeyDown(ev) {
        if (ev.key === "Escape") {
            if (this.state.drawerOpen) {
                this._closeDrawer();
            } else if (this.state.allAppsOpen) {
                this.state.allAppsOpen = false;
            } else if (this.state.flyoutEntry) {
                this._closeFlyout();
            }
        }
    }

    _openDrawer() {
        this.state.drawerOpen = true;
    }

    _closeDrawer() {
        this.state.drawerOpen = false;
        this.state.flyoutEntry = null;
        this.state.allAppsOpen = false;
        this._pointerInFlyout = false;
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
    }

    selectEntry(entry) {
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        const target =
            entry.sections.find((section) => section.leaf) || entry.sections[0];
        this._open(target ? target.leaf : null);
    }

    openItem(menu) {
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this._open(resolveLeaf(menu, this.menuService));
    }

    openApp(app) {
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this._open(resolveLeaf(app, this.menuService));
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
        const menu = this._menuIndex.get(SETTINGS_MENU_XMLID);
        this._open(menu ? resolveLeaf(menu, this.menuService) : null);
        this.state.drawerOpen = false;
    }

    _cancelHoverTimer() {
        if (this._clearHoverTimer) {
            clearTimeout(this._clearHoverTimer);
            this._clearHoverTimer = null;
        }
    }

    hoverEntry(entry) {
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this.state.flyoutEntry = entry;
    }

    _onFlyoutEnter() {
        this._pointerInFlyout = true;
        this._cancelHoverTimer();
    }

    _onFlyoutLeave() {
        this._pointerInFlyout = false;
        this.clearHover();
    }

    clearHover() {
        this._clearHoverTimer = setTimeout(() => {
            if (!this._pointerInFlyout) {
                this.state.flyoutEntry = null;
            }
        }, 180);
    }

    _openFlyout(entry) {
        this._cancelHoverTimer();
        this.state.flyoutEntry = entry;
    }

    _closeFlyout() {
        this._pointerInFlyout = false;
        this._cancelHoverTimer();
        this.state.flyoutEntry = null;
    }

    _onRailKeydown(entry, ev) {
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
            ev.preventDefault();
            this._openFlyout(entry);
        }
        if (ev.key === "Escape") {
            this._closeFlyout();
        }
    }

    toggleAllApps() {
        if (this._clearHoverTimer) clearTimeout(this._clearHoverTimer);
        this.state.allAppsOpen = !this.state.allAppsOpen;
    }

    get allAppsList() {
        return this.state.otherApps;
    }
}

registry.category("main_components").add("erpico_web_sidebar.Sidebar", {
    Component: Sidebar,
    props: {},
});
