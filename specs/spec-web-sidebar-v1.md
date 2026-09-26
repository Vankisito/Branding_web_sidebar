
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
│   └── home.xml                          (menu root `menu_home_root` + ir.actions.client del home)
└── static/
    ├── src/sidebar/                      (OWL, Odoo 19 => OWL 3.x, ES modules)
    │   ├── nav_entries.js                (D-29/D-30: NAV_MAP, HOME_CARDS, resolución por xmlid)
    │   ├── sidebar.js                    (componente principal del rail)
    │   ├── sidebar.xml
    │   ├── sidebar.scss                  (tokens marca + estilos rail/flyout/drawer)
    │   ├── home.js|xml|scss              (D-33: client action `erpico_web_sidebar_home`)
    │   ├── navbar.js|xml                 (patch de `web.NavBar`)
    │   └── landing_patch.js              (fallback home → dashboards → core)
    └── tests/
        └── nav_entries.test.js           (hoot: resolución, fallback, permisos, flyout groups)
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
    "version": "19.0.1.1.0",
    "license": "LGPL-3",
    "category": "Productivity",
    "summary": "Tiendanube-style sidebar navigation, home and minimal topbar for Odoo 19",
    "depends": ["web"],
    "data": ["views/home.xml"],
    "assets": {
        "web.assets_backend": [
            "erpico_web_sidebar/static/src/sidebar/sidebar.scss",
            "erpico_web_sidebar/static/src/sidebar/nav_entries.js",
            "erpico_web_sidebar/static/src/sidebar/home.scss",
            "erpico_web_sidebar/static/src/sidebar/navbar.js",
            "erpico_web_sidebar/static/src/sidebar/navbar.xml",
            "erpico_web_sidebar/static/src/sidebar/sidebar.js",
            "erpico_web_sidebar/static/src/sidebar/sidebar.xml",
            "erpico_web_sidebar/static/src/sidebar/home.js",
            "erpico_web_sidebar/static/src/sidebar/home.xml",
            "erpico_web_sidebar/static/src/sidebar/landing_patch.js",
        ],
        "web.assets_unit_tests": [
            "erpico_web_sidebar/static/tests/**/*.test.js",
        ],
    },
}
```
- Orden canónico de claves OCA. Sin modelos Python ni `ir.model.access.csv` (todo es frontend +
  un `ir.actions.client`); el acceso a cada app lo controla el menú, no un ACL.
- `depends: ["web"]` únicamente: **todos los destinos son detections soft por xmlid**
  (`spreadsheet_dashboard`, `crm`, `sale`, `website_sale`, `point_of_sale`, `stock`, `purchase`,
  `website`, `mass_mailing`, `mass_mailing_sms`). El módulo instala y funciona aunque no haya
  ninguno de esos módulos instalados; lo que no aparece es la entrada o la card. Si el cliente
  quiere garantizar la card de Dashboards en todas las bases, la opción es añadir
  `spreadsheet_dashboard` a `depends` (decisión a confirmar, no aplicada por defecto).
- El bundle de tests usa **hoot** (`@odoo/hoot`), que es el runner de tests unitarios en Odoo 19
  (`web.assets_unit_tests`), no QUnit.

### 5.2 Topbar (t-inherit de `web.NavBar`)

En `static/src/sidebar/navbar.xml` (patch JS de `web.NavBar`; en Odoo 19 la herencia de templates
del core quedó obsoleta, por eso se hace con `patch()` en vez de un XML):

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

### 5.4 Entradas del rail → xmlid + icono brand (D-29/D-30, 2026-09-26)

**Cambio de modelo:** el rail ya **no** se construye sobre `getApps()`. Se construye sobre
`NAV_MAP` (`static/src/sidebar/nav_entries.js`): entradas que apuntan a **menús** por xmlid, con
candidatos alternativos. Motivo: varias de las apps pedidas **no son app roots** en Odoo 19
(verificado contra `odoo/odoo` 19.0 y contra el core `webclient/menus/menu_service.js`).

| # | Entrada | xmlids candidatos (1º presente) | Icono |
|---|---|---|---|
| 1 | Inicio (home) | `erpico_web_sidebar.menu_home_root` | `i-dashboard` (sprite) |
| 2 | CRM | `crm.crm_menu_root` | `brand-clientes-reportes` |
| 3 | Ventas | `sale.sale_menu_root` → `sale.menu_sale_order` → `sale.menu_sale_quotations` | `brand-pedidos-devoluciones` |
| 4 | Ecommerce | `website_sale.menu_ecommerce` | `brand-ecommerce-integrado` |
| 5 | POS | `point_of_sale.menu_point_root` | `brand-punto-de-venta` |
| 6 | Inventario | `stock.menu_stock_root` | `brand-inventario-ubicacion` |
| 7 | Productos | `stock.menu_product_variant_config_stock` → `stock.menu_stock_inventory_control` | `brand-productos` (nuevo) |
| 8 | Compras | `purchase.menu_purchase_root` | `brand-compras` |
| 9 | Website | `website.menu_website_configuration` | `i-globe` (sprite) |
| 10 | Marketing - Email/SMS | `mass_mailing.mass_mailing_menu_root` + `mass_mailing_sms.mass_mailing_sms_menu_root` | `brand-email-marketing` |

**Hallazgos de Odoo 19 que justificaron el cambio (auditados en `odoo/odoo` 19.0):**
- `sale.sale_menu_root` se define con **`active="False"`** en `addons/sale/views/sale_menus.xml`
  (única definición; el `post_init_hook` de `sale` no lo activa) → nunca llega a `getApps()`.
- El módulo `product` **no define ningún `<menuitem>`**; la UI de productos cuelga de Inventario
  (`stock.menu_stock_inventory_control`, hijos en `addons/stock/views/product_views.xml`).
- `website_sale.menu_ecommerce` es submenú de `website.menu_website_configuration`.
- Email Marketing (`mass_mailing`, seq 115) y SMS Marketing (`mass_mailing_sms`, seq 120) son apps
  separadas; en community no existe `sms_marketing`.
- `menuService.getMenu(id)` **sólo acepta id numérico**: para filtrar por xmlid hay que indexar
  `menuService.getAll()`.

**Lógica de filtrado (D-30):** `/web/webclient/load_menus` ya aplica grupos + `active_test`, así que
la presencia del xmlid en `getAll()` **es** el permiso. Sin xmlid resoluble → la entrada no se
renderiza (rail, drawer, flyout, all-apps y home). No se usa `hasGroup()` (mismo criterio que D-24).

**Fuera del rail (D-31):** Contactos, Facturación, Discuss, Calendario y Ajustes quedan sólo en el
panel "Todas las aplicaciones". Ajustes sigue en el footer del drawer y en `goToSettings()`.

**Histórico (D-20, v1):** el rail agrupaba 13 apps mapeadas (Dashboards, Contactos, CRM, POS,
Compras, Facturación, Inventario, Sitio web, Discuss, Calendario, Ajustes) y renderizaba 12/13
porque `sale.sale_menu_root` y `website_sale.menu_ecommerce` no son app roots.

### 5.5 "Todas las aplicaciones" (botón grid, rail-footer)

Abre panel flyout grande listando **todas** las apps de `getApps()` (icono brand si el xmlid está en
`NAV_MAP`, si no `webIconData`, si no `i-grid`). Click → `resolveLeaf(app)` + `selectMenu`.
Es la única vía de acceso a las apps que no están en el rail (D-31).

### 5.6 Landing — Home de ERPICO (D-33, reemplaza a D-10)

**Implementación actual (v1.1):** el home es un `ir.actions.client` con
`tag="erpico_web_sidebar_home"`, registrado en `registry.category("actions")`; en Odoo 19
`_executeClientAction` (`webclient/actions/action_service.js`) monta el componente si
`clientAction.prototype instanceof Component`. El menú `menu_home_root` es root con `sequence=1`,
así que `getApps()[0]` es el home y **el landing es natural, sin patch**.

`landing_patch.js` queda como red de seguridad: `home` → `spreadsheet_dashboard` → `super()`.

Cards v1 (pedido del cliente: sólo las 2 primeras opciones) en `HOME_CARDS`:
Dashboards (`spreadsheet_dashboard.spreadsheet_dashboard_menu_root`) y CRM (`crm.crm_menu_root`).
Cada card se filtra por presencia de menú → misma regla de permisos que el rail (D-30).

> **Histórico (D-10, v1):** el landing era la app `spreadsheet_dashboard` mediante patch de
> `WebClient._loadDefaultApp`, con gate por presencia del menú (D-24) en lugar de `hasGroup`
> (flaky en boot, `groupCache` sin hydrate).

### 5.6.1 Alternativas evaluadas (búsqueda oficial + OCA, 2026-09-26)

- **Odoo oficial 19.0** (`addons/web`): `web.NavBar.AppsMenu` es el único selector de apps del
  core; no hay home genérico. `WebClient._loadDefaultApp` + `menuService.getApps()` (patch) es el
  patrón de referencia para landings.
- **OCA/web (rama 18.0, la 19.0 aún no publicada)**: no existe ningún módulo de sidebar/app-switcher
  equivalente. Lo más cercano es `web_quick_start_screen` (home configurable), que resuelve el mismo
  problema con un modelo Python + ACL + vista, en vez de una client action. Se descarta porque
  nuestro requisito es "home visible para todos + permisos derivados de los menús" y no queremos
  añadir modelos/ACL. Patrón equivalente (`registry.category("actions")` + root menu con
  `sequence=1`) confirmado como válido.
- **Enterprise**: no accesible (addons private). Nota: `web_enterprise` no toca el rail; el
  dashboard de Enterprise no existe en community, de ahí la card a `spreadsheet_dashboard`.

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

- **R-L1 — Drawer móvil no alcanza las apps fuera del rail (BUG-S-022, abierto):** el drawer itera `state.entries` (mismo contenido que el rail desde v1.1), pero el panel "Todas las aplicaciones" cuelga del `<nav>` del rail, que es `d-none d-lg-flex` → no se abre en móvil. Contactos, Facturación, Discuss, Calendario, Ajustes y apps no mapeadas quedan inalcanzables en pantallas pequeñas. Fix propuesto: Extraer el panel a un sibling del `<nav>` (o duplicarlo en el drawer) y exponer el botón grid en el footer del drawer.
- **R-L2 — `otherApps` dependen del entorno:** apps instaladas fuera de `NAV_MAP` aparecen sólo en el panel all-apps (D-31). Si el cliente instala más apps, no entran al rail salvo que se añadan a `NAV_MAP` (data, sin tocar código).
- **R-L3 — Gaps responsivos menores:** 769-991px oculta el rail pero mantiene topbar; 768px exacto tiene ambas vías (toggle + sidebar oculto). Consistente con mockup en ≤768 solo drawer.
- **R-L4 — Action ID 567 fijo en test fullscreen (`/odoo/action-567`):** depende de `rg.wizard_to_theme` de Odoo 19; si cambia en upgrade, `cdp_fullscreen.js` se rompe. No afecta módulo (test-only).
- **R-L5 — Debranding coexistente (BUG-S-017):** 3/22 fallos de la suite `erpico_debranding` son preexistentes (assets frontend, `sale_order.picking_policy`), no del sidebar. Re-validar tras próxima reconstrucción del entorno.
- **R-L6 — Tests CDP con coordinadas absolutas (viewport 1600×900, `getBoundingClientRect`):** frágiles a cambios de layout CSS; versiones Odoo futuras pueden romperlos. Tests de respaldo: smoke + drawer siguen pasando con DOM.

### 9.2b Riesgos v1.1 — rail por entradas (2026-09-26)

- **R-N1 — `sale.sale_menu_root` inactivo:** si un build de Odoo 19 lo activa, entra el target primario y el fallback queda inocuo. Si el build lo renombra, la cadena de 3 candidatos sigue cubriendo. Verificado en runtime: la app Ventas renderiza (CDP).
- **R-N2 — "Productos" depende de stock:** `stock.menu_product_variant_config_stock` exige grupos de inventario; un usuario comercial sin ellos **no ve** el ícono. Es el comportamiento pedido (D-30), pero conviene que el cliente lo confirme.
- **R-N3 — Cambio de `activeAppId` → `isEntryActive`:** la marca activa ahora compara `entry.appIds` con `menuService.getCurrentApp().id`; hay que revalidar fullscreen y drawer (`cdp_fullscreen.js`, `cdp_drawer_nav.js`).
- **R-N4 — Permisos sin recarga en vivo:** si a un usuario se le cambia el grupo con la sesión abierta, el rail se actualiza al recargar (o llamando `menuService.reload()`). No hay suscripción en vivo en v1.