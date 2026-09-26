# Bitácora de Bugs — Módulo `erpico_web_sidebar`

Registro de defectos detectados en el módulo `erpico_web_sidebar` (Odoo 19
Community). Cada bug tiene un ID único e **inmutable** (`BUG-S-XXX`); al
resolverse, el bug se mueve de *Encontrados* a *Resueltos* conservando su ID.

> **Prefijo `BUG-S-`** (sidebar) para evitar colisión con la suite
> `erpico_debranding` (`BUG-XXX` en `erpico_debranding/specs/Bugs.md`).

## Leyenda

**Prioridad** (orden sugerido de atención):
- 🔴 **Crítica** — bloquea operación / webclient no carga / regresión total.
- 🟠 **Alta** — funcionalidad principal rota o ausente; sin workaround razonable.
- 🟡 **Media** — funciona con fricción o hay workaround; afecta la experiencia.
- ⚪ **Baja** — cosmético / configuración / menor.

**Tipo:** `Lógica` (negocio) · `UI/UX` · `Datos` · `Config` · `Seguridad`

**Estado:** `Abierto` · `En progreso` · `Resuelto` · `Pendiente-config`

## Cómo registrar un bug nuevo

Agregar una fila en *Bugs Encontrados* con el próximo `BUG-S-XXX` libre, fecha,
vista/origen, descripción, tipo y prioridad. Si tiene pasos de reproducción no
obvios, añadir un bloque en *Detalle de bugs abiertos*. Al resolverlo, moverlo a
*Bugs Resueltos* con el commit y la fecha.

---

## Bugs Encontrados (Abiertos)

| ID | Fecha | Vista / Origen | Descripción | Tipo | Prioridad | Estado |
|----|-------|----------------|-------------|------|-----------|--------|
| BUG-S-017 | 2026-09-23 | Regresión debranding (Fase 5) | Suite `erpico_debranding` **falla 3 de 22** en stack `sidebar_test` — fallos **ajenos al módulo** (ver detalle abajo). | Entorno/build | ⚪ Baja | En progreso (rama debranding) |
| BUG-S-022 | 2026-09-23 | Drawer móvil (sidebar.xml:130) | **Drawer móvil no alcanza las apps fuera del rail.** Itera `state.entries` (mismo contenido que el rail, D-29), pero el panel "Todas las aplicaciones" vive dentro del `<nav>` del rail, que es `d-none d-lg-flex` → en móvil no se abre. Contactos, Facturación, Discuss, Calendario, Ajustes y cualquier app no mapeada quedan inalcanzables en pantallas pequeñas. | UI/UX | ⚪ Baja | Abierto (mitigado: desde v1.1 el drawer replica el rail completo, incl. Marketing con sus 2 grupos) |
| BUG-S-029 | 2026-09-24 | CDP scripts (ops) | Credenciales hardcodeadas `admin/admin` y URL fija `localhost:8071` en `cdp/*.js`, visibles en repo GitHub público. Sin riesgo de runtime (test-only); riesgo de ops/secretos. Mitigación parcial: `.gitignore` no los cubre (es tooling propio). | Seguridad | ⚪ Baja | Abierto |
| BUG-S-030 | 2026-09-24 | Topbar (navbar.xml:14) | Race de boot: `erpico:open-drawer` se trigger en `env.bus`; si el toggle se clickea antes de que `Sidebar.setup()` monte su listener, el evento se pierde (drawer no abre). Ventana pequeña (1 click). | Lógica | ⚪ Baja | Abierto |
| BUG-S-031 | 2026-09-24 | Drawer móvil (sidebar.xml:164) | Drawer submenú solo **1 nivel**: itera `app._childrenTree` directo. El flyout es recursivo (t-call FlyoutMenu); apps con sub-submenús no muestran la profundidad en el drawer. | UI/UX | ⚪ Baja | Abierto |
| BUG-S-032 | 2026-09-24 | Accesibilidad | Rail sin `aria-current`/`aria-expanded`; toggle móvil sin `aria-expanded`; drawer sin focus trap ni redirect de foco; flyout sin manejo de foco/`aria`; all-apps sin foco visible propio. | UI/UX | ⚪ Baja | Abierto |
| BUG-S-033 | 2026-09-24 | Topbar/rail (logos) | Logos `<a href="/odoo">` (sidebar.xml:13, navbar.xml:19) navegan con recarga plana del webclient → pierde estado SPA (a diferencia de `selectMenu` del core con `href` + `.prevent`). | UI/UX | ⚪ Baja | Abierto |
| BUG-S-034 | 2026-09-25 | Sidebar (sidebar.js:104, sidebar.scss:204) | **Sidebar colapsa/ubica debajo de botones del módulo tras acción fullscreen** (crear SO, RFQ, etc.). `_onUIUpdated` dependía solo de `ACTION_MANAGER:UI-UPDATED` con `evt.detail`; al cerrar acción fullscreen y volver al mismo módulo, el evento puede no dispararse o disparar con `detail:"fullscreen"` otra vez → `fullscreenHidden` permanece `true`. Además, `z-index: $zindex-dropdown - 10` era insuficiente para estar por encima de botones/dropdowns del action manager. | Lógica/UI | 🔴 Crítica | Resuelto |

### Detalle de bugs abiertos

**BUG-S-017 — Regresión debranding: fallos de entorno, no del sidebar**
- *Contexto:* Fase 5 exige suite `erpico_debranding` verde (22/22) con sidebar instalado (spec riesgo 5). Ejecutada sobre `sidebar_test`: **2 FAIL + 1 ERROR de 22**.
- *Fallos (reproducibles SIN sidebar — baseline):*
  1. **`test_login_debranded` (500 != 200):** `QWebError: Unallowed to fetch files from addon website for file website/static/src/snippets/s_badge/000_variables.scss. Addon website is not installed` — el bundle `web.assets_frontend` referencia addons no instalados. `website` SÍ está instalado en BD; el check de assets es un bug/limitación del build Odoo 19 (20260908) con el compilador de assets en modo test.
  2. **`test_purchase_order_portal` (500 != 200):** mismo error con `website_sale` (`s_dynamic_snippet_products/000.scss`).
  3. **`test_sale_order_portal` (ERROR):** `NotNullViolation: null value in column "picking_policy" of relation "sale_order"` — el test crea `sale.order` sin `picking_policy` (campo nuevo requerido en build 19.0-20260908); el test de la rama debranding no lo provee.
- *Evidencia (baseline):* BD `sidebar_baseline` = clon de `sidebar_test` con `erpico_web_sidebar` desinstalado → **3 FAIL + 1 ERROR** (adicionalmente `test_init_odoobot_neutral` por clon sin filestore, artefacto). Los fallos 1–3 se reproducen **idénticos sin el sidebar**.
- *Conclusión:* los 3 fallos son **preexistentes del entorno/build** (`erpico_debranding` vs Odoo 19 build 20260908), **NO introducidos por `erpico_web_sidebar`** (que solo inyecta `web.assets_backend`, nunca frontend/sale). El riesgo 5 de la spec respira: el sidebar no rompe la suite.
- *Acción:* reportar a la rama del módulo debranding / esperar build estable Odoo 19. El sidebar documenta el hallazgo, no lo bloquea.

> Detalle de bugs cerrados (S-001…S-016) en la sección *Bugs Resueltos* (tabla) / historial en `Changelog.md`.

---

## Bugs Resueltos

| ID | Fecha resol. | Descripción | Cómo | Evidencia |
|----|-------------|-------------|------|-----------|
| BUG-S-001 | 2026-09-23 | Template `sidebar.xml` vaciado (regresión total) | `git checkout -- static/src/sidebar/sidebar.xml` (144 líneas M2 restauradas desde `7091cf9`); lección: no borrar templates para refactorizar | CDP: rail renderiza con apps del APP_MAP |
| BUG-S-002 | 2026-09-23 | Landing admin → Dashboards no funcionaba | `landing_patch.js` — patch módulo de `_loadDefaultApp`; gate por presencia de Dashboards (sin `hasGroup`, flaky en boot) | CDP: login → `/odoo/dashboards?dashboard_id=3`; 0 errores consola |
| BUG-S-003 | 2026-09-23 | `useService("bus")` inexistente → setup crashea | Quitado; `this.env.bus` en su lugar | CDP: componente monta, rail visible |
| BUG-S-008 | 2026-09-23 | APP_MAP fuera de spec D-19 | Actualizado a **D-20** (13 apps), xmlids confirmados contra `menuService.getApps()` runtime (Contactos, CRM, POS, Compras, Facturación, Inventario, Website, Load E-commerce, Discuss, Calendario, Ajustes confirmados; `sale.sale_menu_root` existe pero **no es app root** en `load_menus` → rail 12/13) | CDP dump `getApps()`; rail 12 botones |
| BUG-S-009 | 2026-09-23 | `menuService.reload()` dudoso + guard innecesario | Verificado: `reload()` SÍ existe en Odoo 19 (`menu_service.js` fuente). Guard del `onWillStart` eliminado por innecesario (carga de menús ya resuelta antes) | Fuente core `menu_service.js`; smoke sin crash |
| BUG-S-010 | 2026-09-23 | Manifest/asset sucio | `category:'Productivity'`, `data: []`, `assets` indentado + incluye `landing_patch.js`; borrado `_patch.js` | `-u` sin warnings de manifest |
| BUG-S-004 | 2026-09-23 | Toggle mobile sin listener | `Sidebar.setup()` escucha `env.bus "erpico:open-drawer"` (`_openDrawer`); `onWillUnmount` limpia listener | CDP: drawer abre al pulsar toggle |
| BUG-S-005 | 2026-09-23 | Drawer móvil incompleto | Template drawer + backdrop en `sidebar.xml`; SCSS `.o_erpico_drawer`/`.o_erpico_backdrop` con transiciones 300ms; Escape cierra (JS) | CDP: drawer abre/cierra, backdrop, Escape |
| BUG-S-006 | 2026-09-23 | `goToCompany` con evento fantasma | Eliminado `goToCompany()`; `SwitchCompanyMenu` real en footer del drawer (`sidebar.xml` + `sidebar.js` `static.components`) | CDP: SwitchCompanyMenu renderiza |
| BUG-S-007 | 2026-09-23 | `goToSettings` sin `_resolveLeaf` | Ya usaba `_resolveLeaf(getMenu("base.menu_administration"))` en el código restaurado; xmlid confirmado runtime | CDP: Ajustes navega a Settings |
| BUG-S-011 | 2026-09-23 | Spec §5.8/§5.3 pendientes | `readme/CHANGELOG.rst` creado, `margin-left` selectores amplios (.o_main/.o_action_manager/.o_content), QUnit/tour → v2 | `readme/CHANGELOG.rst` + sidebar.scss |
| BUG-S-012 | 2026-09-23 | `goToSettings()` no navega en móvil | `menuService.getMenu()` no existe en Odoo 19 API. Fix: buscar app por xmlid desde `state.railApps/otherApps` (con `_childrenTree` pre-poblado en `onWillStart`) | CDP: Ajustes navega a Settings (móvil) | ✅ Verificado |
| BUG-S-013 | 2026-09-23 | Drawer móvil no cierra al navegar | `selectApp()`/`openItem()` → `_open()` no setean `drawerOpen=false`. Solución: `this.state.drawerOpen = false` en `_open()`. | ✅ Confirmado con cdp_drawer_nav.js: drawer cierra al navegar app/submenu |
| BUG-S-014 | 2026-09-23 | Hover flyout race condition | `hoverApp()` no cancela timer de `clearHover` (180ms). Solución: `hoverApp()` cancela timer pendiente antes de setear flyoutApp. | ✅ Fix aplicado en sidebar.js |
| BUG-S-015 | 2026-09-23 | `toggleDrawer()` código muerto y contradictorio | `toggleDrawer()` toggla `drawerOpen` y triggerea bus que fuerza `true`. Dead code, nadie lo llama. | ✅ Eliminado de sidebar.js |
| BUG-S-016 | 2026-09-23 | Listener `MENUS:APP-CHANGED` sin cleanup | `setup()` lo agregó, `onWillUnmount` nunca lo removió. Solución: removido de setup. | ✅ Cleanup aplicado |
| BUG-S-021 | 2026-09-23 | Breakpoints unificados | `sidebar.scss`: @media de `max-width:768px` → `max-width:991px` para `o_erpico_mobile_toggle`. Toggle visible en todo el rango donde sidebar está oculto (<992px). | ✅ Fix en sidebar.scss |
| BUG-S-023 | 2026-09-23 | Topbar contexto módulo (D-28) | `navbar.xml` restaura brand del módulo (`currentApp.name`), `.o_navbar_breadcrumbs` y `<t t-call="web.NavBar.SectionsMenu">` gateado por `!this.ui.isSmall`. AppsMenu NO restaurado (rail lo sustituye). Solo template, sin JS. | ✅ Fix en navbar.xml + sidebar.scss |
| BUG-S-020 | 2026-09-23 | Test infra CDP | `cdp_layout.js` y `cdp_smoke.js`: `page.setViewport({ width: 1024, height: 768 })` tras `browser.newPage()`. `cdp_smoke.js`: `$$eval` filtrando `offsetParent !== null` para visibilidad real. | ✅ Fix en cdp_layout.js + cdp_smoke.js |
| BUG-S-018 | 2026-09-23 | Fullscreen-hide (S-011a) nunca se activaba | `_onUIUpdated(env)` leía `env.mode`, pero OWL `EventBus.trigger` empaqueta el payload del evento `ACTION_MANAGER:UI-UPDATED` en `event.detail` (el core webclient.js lo desestructura `{detail: mode}`). `env.mode` → `undefined` → `fullscreenHidden` siempre `false`; el sidebar quedaba visible en modo fullscreen. Solución: `_onUIUpdated(evt)` lee `evt.detail` (patrón del core). | ✅ cdp_fullscreen.js: `/odoo/action-567` (target fullscreen real) → sidebar `display:none`; restaura al navegar |
| BUG-S-019 | 2026-09-23 | Flyout se cierra con mouse dentro | `t-on-mouseleave` del rail inicia timer 180ms; flyout no tenía `mouseenter` para cancelarlo. Solución: `_cancelHoverTimer()` en `sidebar.js` + `t-on-mouseenter` en flyout div. | ✅ Fix en sidebar.js + sidebar.xml |
| BUG-S-024 | 2026-09-24 | **CRÍTICO: WebClient en blanco** — `t-call="web.NavBar.SectionsMenu"` sin `t-set="sections"` | Core Odoo 19 exige `<t t-set="sections" t-value="currentAppSections"/>`; sin él `t-foreach="sections"` iteraba `undefined` → `OwlError: Invalid loop expression` → NavBar no renderizaba → **todo el webclient en blanco**. Fix: pasar `sections` (patrón core, verificado contra `web/static/src/webclient/navbar/navbar.xml` de Odoo 19). | ✅ cdp_verify_audit.js: navbar+sections (469ch)+moduleBrand renderizan, 0 errores JS, tras reinicio de bundle |
| BUG-S-025 | 2026-09-24 | Doble margen en `.o_content` (contenido desfasado 60px) | `sidebar.scss` compensaba rail con margen en `.o_action_manager` **y** `.o_content` (`.o_main` además no existe en Odoo 19) → contenido 120px en vez de 60px. Fix: margen solo en `.o_action_manager`; `.o_web_client:has(.o_erpico_sidebar-fullscreen-hidden)` → margen 0 en fullscreen. | ✅ cdp_layout.js R2: `o_content left=60px margin=0`; cdp_verify_audit: actionManager/content/controlPanel x=60 |
| BUG-S-026 | 2026-09-24 | Highlight de app activa estático | `activeAppId` solo se calculaba en `onWillStart`; navegar no actualizaba el `o_active` del rail/drawer. Fix: re-calcular en cada `ACTION_MANAGER:UI-UPDATED` (core actualiza `currentAppId` antes del evento vía `setCurrentMenu`). | ✅ código + suite CDP sin errores |
| BUG-S-027 | 2026-09-24 | `fullscreenHidden` stale con `target="new"` | `_onUIUpdated` saltaba `mode==="new"` → navegar desde fullscreen a una acción `new` dejaba el rail oculto permanentemente. Fix: `fullscreenHidden = (mode === "fullscreen")` incondicional. | ✅ cdp_fullscreen.js C9 sigue pasando (hide+restore) |
| BUG-S-034 | 2026-09-25 | **Sidebar colapsa debajo de botones tras acción fullscreen** | `_onUIUpdated` dependía solo de `ACTION_MANAGER:UI-UPDATED` con `evt.detail`. Al cerrar una acción fullscreen (crear SO, RFQ) y volver al mismo módulo, el evento puede no dispararse o disparar con `detail:"fullscreen"` otra vez → `fullscreenHidden` permanece `true`. Además, `z-index: $zindex-dropdown - 10` era insuficiente para estar por encima de botones/dropdowns del action manager. Fix: (1) `useService("webclient")` con `state.fullscreen` como fuente de verdad, (2) `_syncFullscreen()` con `requestAnimationFrame` loop para sincronización continua, (3) `z-index` elevado a `$zindex-fixed`. | ✅ sidebar.js + sidebar.scss corregidos |
| BUG-S-028 | 2026-09-24 | Flyout pegajoso tras apertura por teclado | `_openFlyout` (ArrowRight/Down) ponía `_hoverLock=true`; `clearHover` respetaba el lock → flyout no cerraba al sacar el mouse (solo Escape/clic lo liberaba). Fix: modelo `_pointerInFlyout` (enter/leave del flyout) que sustituye `_hoverLock`; conserva S-014 (transición rail rápida) y S-019 (mouse dentro). | ✅ cdp_verify_keyboard.js: K3 abre con teclado, K4 cierra en mouseleave, K5 cierra con Escape |

---

*Estado: `Abierto` · `En progreso` · `Resuelto` · `Pendiente-config`.*
