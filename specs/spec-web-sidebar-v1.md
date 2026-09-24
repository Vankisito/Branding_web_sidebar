
### 9.2 Auditoría runtime contra core Odoo 19 (2026-09-24, docker.odoo/19)

Verificación en vivo contra /usr/lib/python3/dist-packages/odoo/addons/web de la
imagen odoo:19 (container odoo_sidebar_test). Bugs encontrados y resueltos:
**S-024** (crash SectionsMenu), **S-025** (doble margen), **S-026** (activeAppId
estático), **S-027** (fullscreen stale en target="new"), **S-028** (flyout
pegajoso por teclado). Detalle en Bugs.md.

**Puntos del audit resueltos como NO-bug (verificados contra core):**
- **Breadcrumbs (A1):** core web.NavBar usa <div class="o_navbar_breadcrumbs d-contents"/> vacío idéntico al nuestro; el contenido se inyecta por t-portal="'.o_navbar_breadcrumbs, .o_fallback_breadcrumbs'" desde control_panel.xml. Nuestro template mantiene el div → OK.
- **item.childrenTree en templates (A6):** menuService.getMenuAsTree() recursa todo el árbol (menu.childrenTree = children.map(getMenuAsTree), menu_service.js:80-85) → childrenTree existe en todos los niveles. Flyout/drawer seguros.
- **Mutación de app.* en onWillStart (A7):** core memoiza con el mismo patrón (getMenuAsTree muta menusData); asignar _icon/_childrenTree es seguro.
- **getMenu("root") (A18):** SÍ existe en Odoo 19 (getApps() internamente usa getMenu("root").children). El refactor a apps[0] en landing_patch.js es **equivalente**, no corrigió ningún crash (sí reduce una llamada).

**Notas de core confirmadas:**
- El webclient monta MainComponentsContainer (donde viven los main_components, nuestro Sidebar) siempre que !state.fullscreen; en fullscreen el NavBar NO se monta.
- ACTION_MANAGER:UI-UPDATED envía detail = _getActionMode(action) → "new" | "fullscreen" | "current" (nunca "main").
# Spec — erpico_web_sidebar v1 — Navegación tipo Tiendanube para Odoo 19

**Estado:** Implementado y validado Fases 0–6 ✅ (D-20/runtime confirmado; S-012…S-023 resueltos; matriz manual + regresión debranding ejecutadas; no-admin landing validado; R2 sin acumulación; C9 fullscreen resuelto; flyout hover fix BUG-S-019 aplicado; topbar contexto módulo D-28 implementado). Listo para entrega.
**Fecha:** 2026-09-22
**Versión objetivo:** 19.0.1.0.0
**Licencia:** LGPL-3.0 or later (OCA)
**Referencias visuales:**
- `specs/mockups/sidebar_topbar_mockup.html` (mockup propio, base funcional)
- `C:\Users\Santi\Downloads\erpico_app_mockup.html` (mockup del jefe — layout, rail, flyout, drawer, topbar, datos demo)
- `C:\Users\Santi\Downloads\erpico_website-Desarrollo\` (assets marca: `public/brand/`, `public/icons/features/`, brand book)

---

## 1. Objetivo

Sustituir la navegación del backend de Odoo por una **sidebar tipo Tiendanube**:

- **Rail** vertical izquierdo, 60px, fondo obsidian `#0C112E`, con iconos de app (brand SVG ERPICO).
- **Flyout** blanco 264px al hover/clic: submenús reales de primer nivel de cada app (click → navega al módulo).
- **Topbar mínima**: brand ERPICO + systray completo de Odoo (buscador original incluido).
- **Landing admin**: app **Dashboards** nativa de Odoo (`spreadsheet_dashboard`).
- **Mobile (≤768px)**: sidebar colapsa a **drawer** con backdrop + acordeón de submenús.
- **Todos los usuarios** ven sidebar. No-admin: sin tableros, aterrizan en app default normal (decisión futura para no-admin).

## 2. Decisiones confirmadas (D-10 … D-24)

| ID | Decisión |
|---|---|
| D-10 | Dashboards = app nativa `spreadsheet_dashboard` tal cual (sin réplica del mockup del jefe) |
| D-11 | Iconos de app = **SVG brand ERPICO** (carpeta assets del módulo) |
| D-12 | Rail muestra solo apps mapeadas que estén **instaladas** |
| D-13 | Flyout = submenús reales vía `menuService.getMenuAsTree().childrenTree` |
| D-14 | Buscador Odoo original se mantiene (systray intacto) |
| D-15 | Ajustes + Cambiar empresa duplicados en rail-footer |
| D-16 | Fuente Outfit embebida en el módulo |
| D-17 | Módulo separado `erpico_web_sidebar` (autocontenido, specs propias) |
| D-18 | Estrategia OCA: **solo herencia/overrides en módulo, jamás editar core** |
| D-19 | Apps objetivo v1: Contactos, CRM, Ventas, POS, Website, E-commerce, Compras, Facturación, Inventario |
| D-20 | Rail = D-19 + **Discuss + Calendario + Ajustes**; quita `base.menu_management`. 13 apps confirmadas runtime (xmlids en §5.4). `sale.sale_menu_root` y `website_sale.menu_ecommerce` existen pero no son app root → rail 12/13 |
| D-23 | Tras editar JS hay que **reiniciar el contenedor** (`docker restart odoo_sidebar_test`) para refrescar bundle cacheado |
| D-24 | Landing Dashboards: gate por **PRESENCIA** del menú (no `hasGroup`, flaky en boot) |

## 3. Alcance / No-alcance

**Incluye v1:**
- Rail + flyout + topbar reemplazo visual + drawer mobile.
- Patch landing admin → Dashboards.
- Duplicar Ajustes y Cambiar empresa en rail.
- Assets: iconos brand, Outfit, logo ERPICO.

**NO incluye v1:**
- Dashboard réplica del mockup del jefe (KPIs/gráficos/tabla) — queda para módulo futuro.
- Búsqueda propia Ctrl+K (se usa la de Odoo).
- Personalización para no-admin (futuro).
- Soporte RTL avanzado / temas custom.

## 4. Cómo sale del core (verificado en código Odoo 19)

### 4.1 Anatomía del WebClient

`web.WebClient` template (`webclient.xml`):
```xml
<t t-name="web.WebClient">
    <t t-if="!state.fullscreen">
        <NavBar/>
    </t>
    <ActionContainer/>
    <MainComponentsContainer/>
</t>
```
- `NavBar` (web.NavBar) contiene: AppsMenu, Brand dropdown, breadcrumbs, SectionsMenu, y el **systray** (`web.NavBar` líneas 11-42) — sus items vienen de `registry.category("systray")`.
- `MainComponentsContainer` monta componentes del registry **`main_components`** (`main_components_container.js:7`). → **Hook perfecto para montar el sidebar globalmente sin tocar el template WebClient.**

### 4.2 Datos de menús (`menu_service.js`)

```js
getApps()            // root.children -> apps (incluye webIconData, xmlid, actionID, actionPath)
getMenuAsTree(id)    // => .childrenTree (submenús recursivos)
selectMenu(menu)     // doAction(actionID) + setCurrentMenu
getCurrentApp()
```
Handler core de navegación: `onNavBarDropdownItemSelection(menu) => menuService.selectMenu(menu)` (`navbar.js:205`).

### 4.3 Aterrizaje default

`WebClient._loadDefaultApp()` (`webclient.js:143`): selecciona `root.children[0]` (primer app por sequence). Se parchea para admin → app Dashboards.

### 4.4 Systray

El systray se renderiza dentro de `web.NavBar`. **Estrategia: NO reemplazar el componente NavBar** — se hereda el template `web.NavBar` (t-inherit), se eliminan por xpath las secciones sobrantes (AppsMenu, brand, breadcrumbs, sections) y se inyecta marca + toggle. Así el systray (buscador, notificaciones, usuario, mensajes, debug) queda intacto → cumple D-14.

## 5. Arquitectura del módulo

```
erpico_web_sidebar/
├── __manifest__.py
├── __init__.py
├── readme/
│   ├── DESCRIPTION.rst
│   ├── USAGE.rst
│   └── CONTRIBUTORS.rst
├── specs/
│   ├── spec-web-sidebar-v1.md          (este archivo)
│   └── mockups/sidebar_topbar_mockup.html
├── views/
│   └── webclient_templates.xml         (t-inherit web.NavBar + patches de marca)
└── static/src/
    ├── sidebar/                        (OWL, Odoo 19 => OWL 3.x, ES modules)
    │   ├── sidebar.js                  (componente principal + subcomponentes)
    │   ├── sidebar.xml
    │   └── sidebar.scss                (tokens marca + estilos rail/flyout/drawer)
    ├── icons/
    │   ├── brand-*.svg                 (copia de public/icons/features/ del repo website)
    │   └── ui-sprite.svg               (symbols genéricos: grid, dashboard, settings, etc. extraídos del mockup)
    ├── fonts/
    │   └── Outfit-[wght]-woff2.woff2   (extraída del base64 del mockup del jefe)
    └── images/
        └── erpico-logo-horizontal.png  (de public/brand/)
```

### 5.1 Manifest

```python
{
    "name": "ERPICO Web Sidebar",
    "version": "19.0.1.0.0",
    "license": "LGPL-3",
    "category": "Productivity",
    "summary": "Tiendanube-style sidebar navigation + minimal topbar for Odoo 19",
    "depends": ["web"],
    "data": ["views/webclient_templates.xml"],
    "assets": {
        "web.assets_backend": [
            "erpico_web_sidebar/static/src/sidebar/sidebar.scss",
            "erpico_web_sidebar/static/src/sidebar/sidebar.js",
            "erpico_web_sidebar/static/src/sidebar/sidebar.xml",
        ]
    },
}
```
- `depends: ["web"]` únicamente. Detección de Dashboards **en runtime** (soft): el módulo funciona aunque `spreadsheet_dashboard` no esté instalado.
- Orden canónico de claves OCA.

### 5.2 Topbar (t-inherit de `web.NavBar`)

En `views/webclient_templates.xml`:

```xml
<t t-inherit="web.NavBar" t-inherit-mode="extension">
    <!-- quitar AppsMenu -->
    <xpath expr="//t[@t-call='web.NavBar.AppsMenu']" position="replace"/>
    <!-- quitar brand dropdown -->
    <xpath expr="//DropdownItem[contains(@class, 'o_menu_brand')]" position="replace"/>
    <!-- quitar breadcrumbs -->
    <xpath expr="//div[hasclass('o_navbar_breadcrumbs')]" position="replace"/>
    <!-- quitar sections -->
    <xpath expr="//div[hasclass('o_menu_sections')]" position="replace"/>
    <!-- brand ERPICO + toggle mobile al inicio del nav -->
    <xpath expr="//nav[hasclass('o_main_navbar')]" position="inside">
        <button t-if="this.ui.isSmall" class="o_erpico_mobile_toggle" aria-label="Abrir menú" t-on-click="..."/>
        <a class="o_erpico_brand" href="/odoo">
            <img src="/erpico_web_sidebar/static/src/images/erpico-logo-horizontal.png" alt="Erpico"/>
        </a>
        <span class="o_erpico_workspace">Mi espacio de trabajo</span>
    </xpath>
</t>
```
> Nota: `DropdownItem`/toggle brand — comprobar selectores exactos contra `navbar.xml` en build. El toggle mobile abre el drawer (bus del sidebar o evento DOM).

Systray queda **igual** (`o_menu_systray` ms-auto). Con esto la topbar = brand + systray, D-14 cumplido.

### 5.2a Topbar v2 — restaurar contexto del módulo (D-28)

**Estado: implementado** (BUG-S-023 resuelto). Feedback cliente 2026-09-23: la topbar anterior era demasiado
mínima (logo ERPICO + systray) y perdía la orientación dentro del módulo. Nueva
topbar **conserva el contexto del módulo como Odoo stock**:

- Logo ERPICO (marca) mantenido como brand de la empresa.
- **Brand del módulo** (`o_menu_brand`, `DropdownItem` con `currentApp.name`) — al estar dentro de un módulo muestra su nombre (clic → raíz del módulo).
- **Breadcrumbs** (`<div class="o_navbar_breadcrumbs d-contents"/>`) — portal del core (`control_panel.xml` los monta ahí; si no hay breadcrumbs queda vacío sin efectos).
- **Secciones del módulo** (`<t t-call="web.NavBar.SectionsMenu">` gateado `!this.ui.isSmall` y `currentAppSections.length`).
- Systray + toggle mobile **sin cambios**.
- **AppsMenu del core NO se restaura:** el rail/drawer sustituye el selector de apps (D-20).

Implementación: patch del template `web.NavBar` (`navbar.xml`) que **conserva** los
bloques core (brand, breadcrumbs, sections) en lugar de eliminarlos. El componente
`NavBar` ya expone `currentApp` / `currentAppSections` / `onNavBarDropdownItemSelection`
— no requiere cambios de JS. Ver BUG-S-023.

### 5.3 Sidebar (componente OWL en `main_components`)

```js
// sidebar.js
registry.category("main_components").add("erpico_web_sidebar.Sidebar", { Component: Sidebar }, { sequence: 10 });
```
Monta rail + flyout + drawer sin tocar el template de WebClient.

**Estado interno (OWL):**
```js
state = {
    apps: menuService.getApps(),            // filtrados por mapeo + instalados
    currentApp: menuService.getCurrentApp(),
    openFlyoutApp: null,                    // app del flyout activo
    allAppsOpened: false,                   // panel "Todas las aplicaciones"
    drawerOpened: false,                    // mobile
}
```
Servicios: `menu`, `action`, `ui` (para `isSmall`). Suscripciones: `MENUS:APP-CHANGED` (actualizar currentApp), `ACTION_MANAGER:UI-UPDATED` (ocultar en fullscreen, igual que WebClient).

**Eventos (igual que el mockup):**
- `pointerenter`/`focus` sobre rail-button → abrir flyout (`openFlyout(app)`).
- `pointerleave` con delay 180ms → cerrar flyout.
- `ArrowRight/ArrowDown` → abrir flyout (accesibilidad).
- `Escape` → cerrar flyout/drawer.
- Click en submenú → `menuService.selectMenu(item)` (D-13, misma API que el core).
- Rail-footer: Ajustes → `selectMenu` del menú settings (`base.menu_administration`, verificar xmlid en runtime); Cambiar empresa → **reutilizar `SwitchCompanyMenu`** (`@web/webclient/switch_company_menu/switch_company_menu`, component exportado) renderizado en el footer del rail → dropdown real de empresas, sin duplicar lógica.

### 5.4 Mapeo app → icono brand (D-20 confirmado runtime)

`getApps()` devuelve root menus con `xmlid`. Mapa clave = xmlid del menú root (**confirmado** contra `menuService.getApps()` runtime 2026-09-23):

| # | App | xmlid | Icono |
|---|---|---|---|
| 1 | Dashboards | `spreadsheet_dashboard.spreadsheet_dashboard_menu_root` | `i-dashboard` (sprite) |
| 2 | Contactos | `contacts.menu_contacts` | `i-building` (sprite) |
| 3 | CRM | `crm.crm_menu_root` | `brand-clientes-reportes` |
| 4 | Punto de venta | `point_of_sale.menu_point_root` | `brand-punto-de-venta` |
| 5 | Compras | `purchase.menu_purchase_root` | `brand-compras` |
| 6 | Facturación | `account.menu_finance` | `brand-facturacion` |
| 7 | Inventario | `stock.menu_stock_root` | `brand-inventario-ubicacion` |
| 8 | Sitio web | `website.menu_website_configuration` | `i-globe` (sprite) |
| 9 | **Discuss** | `mail.menu_root_discuss` | `i-bell` (sprite) |
| 10 | **Calendario** | `calendar.mail_menu_calendar` | `i-calendar` (sprite) |
| 11 | **Ajustes** | `base.menu_administration` | `i-settings` (sprite) |

> **No son app root** (no entran al rail): `sale.sale_menu_root` (res 278, action None), `website_sale.menu_ecommerce` (submenú de Sitio web). Rail renderiza **12/13** de las apps mapeadas.
> **Eliminado:** `base.menu_management` (Apps/Marketplace — no deseado, D-20).

**Lógica de filtrado (D-12):** se renderizan solo apps del mapa cuyo xmlid exista entre `getApps()`. Apps no mapeadas (proyectos, marketing…) **no** aparecen en el rail (accesibles vía "Todas las aplicaciones").
**Fallback de icono:** si una app del mapa tiene xmlid distinto al confirmado → intentar match por nombre (`getCurrentApp().name` traducción) o usar `webIconData` de la app.

**Orden del rail (D-20):** Dashboards, Contactos, CRM, Punto de venta, Compras, Facturación, Inventario, Sitio web, Discuss, Calendario, Ajustes.

### 5.5 "Todas las aplicaciones" (botón grid, rail-top)

Abre panel flyout grande listando **todas** las apps de `getApps()` (icono brand si hay mapeo, si no `webIconData`). Click → `selectMenu`.

### 5.6 Landing admin — Dashboards (D-10)

Patch sobre `WebClient` (`@web/core/utils/patch`):

```js
import { WebClient } from "@web/webclient/webclient";
patch(WebClient.prototype, {
    async _loadDefaultApp() {
        const menu = useService?NO — hook no disponible en método estático del prototype;
        // ver §5.6.1
    },
});
```

> **Ojo implementación**: `_loadDefaultApp` es método de instancia; el servicio `menu` se accede vía `this.menuService` (ya expuesto en WebClient). Patch limpio:

```js
patch(WebClient.prototype, {
    async _loadDefaultApp() {
        const isAdmin = this.session?.uid && ...; // verificar group
        const dashboards = this.menuService.getApps().find(app =>
            app.xmlid?.includes("spreadsheet_dashboard_menu_root") ||
            app.name?.toLowerCase().includes("dashboards"));
        if (dashboards) return this.menuService.selectMenu(dashboards);
        return super._loadDefaultApp();
    },
});
```
- **Admin = usuario con group** `spreadsheet_dashboard.group_dashboard_manager` (o fallback: `user_has_groups` vía `orm`). Detalle a cerrar en build.
- No-admin: `super._loadDefaultApp()` → comportamiento core (primer app).
- Si `spreadsheet_dashboard` no instalado: `super`.

### 5.7 Mobile drawer (≤768px)

- Rail oculto; botón toggle en topbar abre **drawer** (300-320px, obsidian o blanco según mockup — mockup: drawer blanco con logo marca, acordeón de apps con submenús, footer con acciones).
- Backdrop oscuro click → cierra. `Escape` cierra. `ui.isSmall` de Odoo como breakpoint (768px).
- Acordeón: por app → links de submenú (childrenTree), click → `selectMenu`.

### 5.8 Estilos y tokens (vienen del brand book + mockup)

```scss
$erpico-horizon: #2c85c7;  $erpico-horizon-strong: #1f6da8;
$erpico-sandy: #e99a55;    $erpico-obsidian: #0c112e;
$erpico-chalk: #f7f9fb;    $erpico-lavender: #dfe8ef;
$erpico-rail-hover: #1c2446;  $erpico-rail-text: #b9c5d8;
$erpico-rail-w: 60px;      $erpico-topbar-h: 52px;
```
- Fuentes: `@font-face` Outfit (títulos) + Work Sans (body) — ambas embebidas (Outfit extraída del base64 del mockup; Work Sans del repo website o Google Fonts).
- Content: `margin-left: $rail-w` en `.o_main` (solo desktop). Verificar selector exacto contra build.
- Topbar: `position: sticky` sobre la sidebar (z-index: rail 40, topbar 30, flyout 45 — del mockup).
- Fullscreen: `.o_erpico_sidebar-fullscreen-hidden { display: none !important }` cuando `ACTION_MANAGER:UI-UPDATED` envía `mode === 'fullscreen'`.

## 6. Assets a extraer (build-time)

| Fuente | Destino |
|---|---|
| `website-Desarrollo/public/icons/features/*.svg` (15 icons) | `static/src/icons/brand-*.svg` |
| `<symbol id="i-*">` del mockup (grid, dashboard, settings, building, chevron, close, menu, help, bell, down, arrow…) | sprite `ui-sprite.svg` |
| Outfit woff2 del base64 del mockup (bloque `@font-face`, líneas ~13-62) | `static/src/fonts/` |
| `erpico-logo-horizontal.png` | `static/src/images/` |

## 7. Plan de QA

1. **Unit QUnit** (JS): mapeo/filtro de apps (D-12), orden rail, open/close flyout, patch `_loadDefaultApp` (admin vs no-admin vs sin dashboards).
2. **Tour/runtime Edge headless + CDP** (patrón validado en `erpico_debranding`): login admin → `/web` → console errores 0, rail renderizado, flyout abre, click submenú navega, landing = Dashboards.
3. **Manual matrix** (docker `debrand_test`): login admin y usuario ventas (no-admin), apps instaladas/desinstaladas, mobile viewport 375px, multi-empresa, teclado (Escape/arrows).
4. Re-validar que `erpico_debranding` (fix BUG-011) sigue sin errores con el módulo nuevo instalado.

## 8. Milestones

- **M0**: skeleton módulo (manifest, readme, folders) + assets extraídos → ✅ commit `7091cf9`.
- **M1**: t-inherit `web.NavBar` → topbar brand + systray OK; navbar sobrante eliminada → ✅ validado runtime (CDP: `.o_main_navbar` presente, 0 errores).
- **M2**: Sidebar en `main_components` → rail + flyout + filtrado mapeo + selectMenu + "Todas las aplicaciones" → ✅ restaurado (S-001) + validado (rail 12 botones).
- **M3**: patch `_loadDefaultApp` admin → Dashboards → ✅ `landing_patch.js` (D-24) — login → `/odoo/dashboards?dashboard_id=3`.
- **M4**: drawer mobile + footer Ajustes/SwitchCompanyMenu + ajustes CSS de contenido/fullscreen → ✅ drawer funcional, S-012/S-013 resueltos, SwitchCompany renderiza.
- **M5**: CDP Edge headless (smoke + drawer + settings), matriz manual, regresión debranding; docs (Bugs.md, Changelog, TESTS_COVERAGE actualizados); C9 fullscreen resuelto (S-018/BUG-S-011a) → ✅ Completo.
- **M6**: Fix BUG-S-019 (flyout hover) y fix BUG-S-023 (topbar contexto módulo D-28), actualización docs spec → ✅ Completo. Listo para entrega.

## 9. Riesgos / puntos abiertos

1. ~~xmlids de menús root (contacts, website, website_sale, account, pos) provisorios~~ → ✅ confirmados runtime (D-20, Fase 3 CDP).
2. ~~Ajustes: confirmar acción/menú settings exacto (community)~~ → ✅ `base.menu_administration` root; navegación S-012 resuelta.
3. ~~`SwitchCompanyMenu` en rail footer~~ → ✅ renderiza como `.o-dropdown` nativo (cdp_matrix/drawer).
4. ~~Iconos Contactos/Sitio web sin brand~~ → ✅ brand + `i-building`/`i-globe`/ico `webIconData` fallback definido (D-11); Contactos usa brand.
5. Fusión con `erpico_debranding` → ✅ regresión ejecutada (BUG-S-017): el sidebar **no interfiere**; fallos de la suite son preexistentes del build/local (assets frontend + `sale_order.picking_policy`).
6. ~~Menú root de Dashboards community vs enterprise~~ → ✅ `spreadsheet_dashboard` community instalado y verificado (landing + rail).

### 9.1 Riesgos nuevos (Fase 6 cierre — análisis de código + CDP)

**Riesgos medios:**

- - **R-M1 — Breakpoints sin navegación (BUG-S-021):** ~~sidebar visible solo ≥992px, toggle drawer solo ≤768px → **769-991px sin acceso a apps**~~ **Resuelto** con unificación del breakpoint a `max-width:991px` en `sidebar.scss`.
- **R-M2 — Flyout se cierra con el ratón dentro (BUG-S-019):** ~~el `mouseleave` del botón rail arranca timer 180ms no cancelado por `mouseenter` del flyout → submenús no clicables con mouse (teclado sí).~~ **Resuelto** con `_cancelHoverTimer()` + `t-on-mouseenter` en flyout div.
- **R-M3 — Falso negativo de tests CDP (BUG-S-020):** `cdp_layout.js`/`cdp_smoke.js` usan viewport default 800×600 → `cdp_layout.js` reporta sidebar oculto cuando es breakpoint, no bug. `cdp_smoke.js` no valida visibilidad real (cuenta DOM). Resultados green no prueban visibilidad a <992px.

**Riesgos bajos:**

- **R-L1 — Drawer móvil excluye `otherApps` (BUG-S-022):** apps sin icono brand (Email Marketing, Apps) inaccesibles en móvil. Mitigación: agregarlas al drawer o al APP_MAP.
- **R-L2 — `otherApps` dependen del entorno:** apps instaladas fuera del APP_MAP (13 apps D-20) aparecen en `otherApps` y se ven en panel all-apps. Si el cliente instala más apps sin brand, el rail no las muestra (comportamiento esperado por spec).
- **R-L3 — Gaps responsivos menores:** 769-991px oculta el rail pero mantiene topbar; 768px exacto tiene ambas vías (toggle + sidebar oculto). Consistente con mockup en ≤768 solo drawer.
- **R-L4 — Action ID 567 fijo en test fullscreen (`/odoo/action-567`):** depende de `rg.wizard_to_theme` de Odoo 19; si cambia en upgrade, `cdp_fullscreen.js` se rompe. No afecta módulo (test-only).
- **R-L5 — Debranding coexistente (BUG-S-017):** 3/22 fallos de la suite `erpico_debranding` son preexistentes (assets frontend, `sale_order.picking_policy`), no del sidebar. Re-validar tras próxima reconstrucción del entorno.
- **R-L6 — Tests CDP con coordinadas absolutas (viewport 1600×900, `getBoundingClientRect`):** frágiles a cambios de layout CSS; versiones Odoo futuras pueden romperlos. Tests de respaldo: smoke + drawer siguen pasando con DOM.