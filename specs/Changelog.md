# Changelog — Módulo `erpico_web_sidebar`

> Actualizar al cerrar cada sesión: qué se hizo, archivos creados/modificados,
> pendientes y decisiones nuevas.

---

## Sesión 2026-09-26 — QA runtime v1.1 completa (C13-C18) + trampas Odoo 19

### Qué se hizo

Ejecutada la QA runtime de v1.1 contra el stack Docker (`compose.test.yml`, puerto 8071,
Odoo 19.0-20260908). **Los 10 scripts CDP pasan**: `cdp_home`, `cdp_allapps`, `cdp_smoke`,
`cdp_hover`, `cdp_drawer`, `cdp_drawer_nav`, `cdp_layout`, `cdp_fullscreen`, `cdp_settings`,
`cdp_matrix`.

**C13-C18 cerrados** (antes ⏳): Home es el landing y muestra 2 cards que navegan, el rail
respeta el orden de `NAV_MAP` (10 entradas), y un usuario sin POS/stock/ventas no ve esos
íconos. La matriz se validó con logins reales (uid confirmado por `get_session_info`):

| Usuario | Rail observado | Home |
|---|---|---|
| `admin` (uid 2) | 10 entradas | 2 cards |
| `ventas` (uid 17) | 5: Inicio, CRM, Ventas, Ecommerce, Website | 2 cards |
| `basic` (uid 18) | 2: Inicio, Website | 1 card (CRM filtrado) |

`Website` aparece para `basic` porque su xmlid sólo exige `Role / User`, grupo que core
concede a los internal users: el sidebar refleja core, no lo oculta.

**Bugs de los propios scripts de test encontrados y corregidos** (no del módulo):
- `cdp_smoke.js`: labels y assert obsoletos de landings anteriores a v1.1; ahora valida Home.
- `cdp_drawer.js` comprobaba Ajustes *después* de cerrar el drawer; los checks (10 entradas,
  grupos de Marketing, backdrop, Escape) se hacen con el drawer abierto.
- `cdp_settings.js` ahora verifica URL real `/odoo/settings` y que el drawer cierre.
- `cdp_drawer_nav.js` log invertido: `NO — cerró (OK)` en lugar de leerse como fallo.
- `cdp_matrix.js` reescrito: contextos de browser aislados por usuario (reutilizar la
  pestaña hacía que el 2º login no emitiera POST y colgara la navegación) y verificación de
  sesión por RPC en vez de por la URL.

**Fix real de manifest**: `web.assets_unit_tests` no arrastra `web.assets_backend`, así que
`nav_entries.js` (el módulo bajo test) faltaba siempre en el bundle de Hoot. Ahora se declara
explícitamente junto al glob de tests.

**Hoot en browser: NO VERIFICADO.** `/web/tests?module=erpico_web_sidebar` monta
`HOOT-CONTAINER` pero no ejecuta los tests con Puppeteer (`odoo.loader.modules` = 64, sin
factories de Hoot) y el loader reporta
`modules needed by other modules but have not been defined: [@erpico_web_sidebar/static/src/sidebar/nav_entries]`.
Pendiente: el wrapper `hoot_module_loader.js` sufija los módulos con `" (hoot)"` y las
dependencias declaradas no se resuelven. La lógica JS queda cubierta por los asserts Node y
por la suite CDP E2E.

**Trampas de Odoo 19 documentadas** (valen para cualquier CDP futuro): `/web/logout` es 404
(la ruta es `/web/session/logout`; con la ruta vieja los checks corrían con la sesión previa y
daban falsos verdes), el login es un form HTML plano que necesita el botón visible y
`window.odoo` existente antes del click, `res.users.password` es computado (hay que usar
`_set_encrypted_password` + `env.cr.commit()`, y `odoo shell` hace rollback al salir), el RPC
JSON exige `Content-Type: application/json` + `X-Requested-With: XMLHttpRequest`, y tras
cambiar `__manifest__.py` hay que **reiniciar el contenedor** (`-u` no refresca el manifest
cacheado).

### Archivos

- Nuevos: `cdp/cdp_home.js`, `cdp/cdp_hoot.js` (runner Hoot, pendiente), `views/home.xml`,
  `static/src/sidebar/{nav_entries,home}.js`, `home.{xml,scss}`,
  `static/src/icons/brand-productos.svg`, `static/tests/nav_entries.test.js`.
- Modificados: `cdp/cdp_{matrix,drawer,drawer_nav,smoke,settings,allapps}.js`,
  `__manifest__.py`, `static/src/sidebar/{sidebar.js,sidebar.xml,sidebar.scss,landing_patch.js}`,
  `specs/{TESTS_COVERAGE,Changelog,Decisiones,Bugs,spec-web-sidebar-v1}.md`,
  `readme/{USAGE,CHANGELOG}.rst`.
- Eliminado: `views/webclient_templates.xml`.

### Pendientes

- Hoot en browser (ver arriba).
- `BUG-S-022` (panel all-apps no alcanzable en móvil) y `BUG-S-031` (drawer limita los
  submenús a un nivel) siguen abiertos como limitaciones conocidas de v1.1.
- Baseline de debranding: 3/22 fallos preexistentes, no del módulo.

---

## Sesión 2026-09-24 — Auditoría runtime core Odoo 19 + fixes S-024...S-028

### Qué se hizo

Levantado el stack Docker (`compose.test.yml`, puerto 8071) y verificados los hallazgos
punto a punto contra el código fuente del core Odoo 19 dentro del container
(`web/static/src/webclient/navbar/navbar.xml`, `menu_service.js`, `action_service.js`,
`webclient.xml`, `webclient_layout.scss`).

**Bugs confirmados y corregidos (ver bugs S-024...S-028 en Bugs.md):**
- **S-024 (crítico):** `t-call="web.NavBar.SectionsMenu"` sin `t-set="sections"` →
  `t-foreach="sections"` iteraba undefined → `OwlError: Invalid loop expression` →
  NavBar no renderizaba → webclient en blanco (todo el backend). Confirmado en vivo:
  `pageerror` exacto. Fix: pasar `t-set sections=currentAppSections` (patrón core).
- **S-025:** doble margen en `.o_content` (contenido a 120px en vez de 60px, desfasado
  60px vs el control panel). Verificado en vivo: `content.x=120`. Fix: margen solo en
  `.o_action_manager`; `:has(.o_erpico_sidebar-fullscreen-hidden)` → 0 en fullscreen.
- **S-026:** `activeAppId` solo en `onWillStart` → highlight rail no seguía la
  navegación. Fix: recalcular en `ACTION_MANAGER:UI-UPDATED`.
- **S-027:** `_onUIUpdated` saltaba `mode==="new"` → rail quedaba oculto tras navegar
  desde fullscreen a una acción target="new". Fix: `fullscreenHidden = mode==="fullscreen"`
  incondicional.
- **S-028:** `_hoverLock` permanente tras apertura por teclado → flyout pegajoso. Fix:
  modelo `_pointerInFlyout` (enter/leave del flyout); conserva S-014 y S-019.

**Puntos del audit descartados como NO-bug (verificados contra core):**
- Breadcrumbs: el div `o_navbar_breadcrumbs` vacío es idéntico al core; el contenido
  llega por `t-portal` desde control_panel.
- `item.childrenTree` en todos los niveles: `getMenuAsTree()` recursa completo.
- Mutación `app.*` en onWillStart: mismo patrón de memoización del core.
- `getMenu("root")` sí existe en Odoo 19; el refactor de landing_patch a `apps[0]` es equivalente.

**Menores:** header `/** @odoo-module **/` en navbar.js (consistencia OCA); CDP
`headless: 'new'` → `true` en los 9 scripts (puppeteer 25 lo depreca).

### Archivos modificados
- `static/src/sidebar/navbar.xml` — t-set sections en SectionsMenu (S-024)
- `static/src/sidebar/sidebar.scss` — margen solo en .o_action_manager + :has fullscreen (S-025)
- `static/src/sidebar/sidebar.js` — _onUIUpdated incondicional + activeAppId dinámico (S-026/S-027); _pointerInFlyout (S-028)
- `static/src/sidebar/sidebar.xml` — handlers flyout enter/leave (S-028)
- `static/src/sidebar/navbar.js` — header @odoo-module
- `cdp/*.js` — headless true; añadidos `cdp_verify_audit.js` (regresión S-024/S-025), `cdp_verify_keyboard.js` (regresión S-028)
- `specs/Bugs.md` — S-024...S-028 en Resueltos
- `specs/spec-web-sidebar-v1.md` — §9.2 auditoría core
- `readme/CHANGELOG.rst` — entradas 19.0.1.0.2

### Verificación (CDP, stack docker, 1024/1600px)
- `cdp_verify_audit.js`: navbar+sections+moduleBrand renderizan, 0 errores JS; layout actionManager/content/controlPanel x=60.
- `cdp_smoke.js`: 0 errores consola, rail 12 botones.
- `cdp_hover.js`: S-014/S-019 intactos (transición rápida + mouse dentro).
- `cdp_verify_keyboard.js`: K3 teclado abre flyout, K4 mouseleave cierra (S-028), K5 Escape cierra.
- `cdp_layout.js`: R2 sin acumulación (content left=60, margin=0).
- `cdp_fullscreen.js`: C9 pasa (hide fullscreen + restore).

- **Búsqueda OCA completada (2026-09-26):** OCA/web no tiene módulo de sidebar/app-switcher
  equivalente; el más cercano es `web_quick_start_screen` (home configurable con modelo Python +
  ACL). Se mantiene el enfoque de client action sin modelos. Detalle en spec §5.6.1.
### Estado al cierre
- Bugs S-001...S-021, S-023, S-024...S-028 resueltos. S-017 (entorno debranding) y S-022 (otherApps drawer) pendientes.

---

## Sesion 2026-09-23 — Code audit + fixes menores

### Que se hizo

Revision completa del modulo tras bugs S-019 a S-023. Se encontraron y corrigieron
problemas adicionales:

**sidebar.js — code cleanup:**
- `_hoverLock` nunca se inicializaba en `setup()`. Se agrego `this._hoverLock = false`
  para evitar acceso a `undefined` en `clearHover()`.
- `_onAppChanged()` era codigo muerto (el listener `MENUS:APP-CHANGED` fue removido
  en BUG-S-016). Se elimino el metodo y su binding en `setup()`.

**navbar.xml — SectionsMenu:**
- Se cambio de `t-component="SectionsMenu"` a `t-call="web.NavBar.SectionsMenu"`
  por compatibilidad con el componente parcheado.

### Archivos modificados
- `static/src/sidebar/sidebar.js` — `_hoverLock` init, eliminado `_onAppChanged`
- `static/src/sidebar/navbar.xml` — `t-call` para SectionsMenu

---

## Sesión 2026-09-23 — Fix BUG-S-020 (test infra CDP)

### Qué se hizo

**BUG-S-020:** tests CDP con viewport default Puppeteer (800×600) → lectura falsa de layout.

**Fix:**
- `cdp_layout.js`: `await page.setViewport({ width: 1024, height: 768 })` tras `browser.newPage()`.
- `cdp_smoke.js`: idem. `page.setViewport` garantiza viewport correcto de 1024×768.
- `cdp_smoke.js` C2: `page.$$('.o_erpico_rail_btn')` → `page.$$eval('.o_erpico_rail_btn', els => els.filter(el => el.offsetParent !== null))`. Ahora solo cuenta botones **visibles**, no elementos DOM ocultos por CSS.

### Archivos modificados
- `cdp/cdp_layout.js` — setViewport
- `cdp/cdp_smoke.js` — setViewport + visibilidad real

### Estado al cierre
- Bugs S-001…S-020 resueltos (S-022 pendiente).

---

## Sesión 2026-09-23 — Fix BUG-S-021 (breakpoints)

### Qué se hizo

**BUG-S-021:** gap 769-991px sin acceso a apps. El sidebar usa \d-lg-flex\ (visible ≥992px) pero el toggle móvil usa \@media (max-width:768px)\ (visible solo ≤768px). En el rango intermedio: sin sidebar Y sin toggle.

**Fix en \sidebar.scss\: unificación del breakpoint**
- \@media (max-width: 768px)\ → \@media (max-width: 991px)\ para el bloque del toggle, workspace divider/label, y module brand/breadcrumbs.
- El toggle ahora es visible en todo viewport donde el sidebar está oculto (<992px).
- El drawer (JS-driven) ya funciona a cualquier viewport — solo necesitaba el botón visible.

### Archivos modificados
- \static/src/sidebar/sidebar.scss\ — unificación breakpoint
- \specs/Bugs.md\ — BUG-S-021 → Resuelto
- \specs/spec-web-sidebar-v1.md\ — R-M1 → Resuelta

### Estado al cierre
- Bugs S-001…S-021 resueltos (S-022 y S-020 pendientes).

---

## Sesión 2026-09-23 — Fix BUG-S-023 (topbar contexto módulo)

### Qué se hizo

**BUG-S-023 (D-28):** la topbar v1 solo mostraba logo ERPICO + systray, eliminando brand del módulo, breadcrumbs y secciones. Al entrar a un módulo faltaba orientación.

**Fix en `navbar.xml` (solo template, sin JS):**
- Restaurado brand del módulo actual (`currentApp.name`) como botón clickeable que navega a la raíz del módulo via `onNavBarDropdownItemSelection(currentApp)`.
- Restaurado contenedor `.o_navbar_breadcrumbs` para breadcrumbs del core.
- Restaurado `<t t-call="web.NavBar.SectionsMenu">` gateado por `!this.ui.isSmall and currentAppSections.length`.
- **AppsMenu del core NO se restaura** — el rail/drawer ERPICO lo sustituye (D-20).
- Systray + toggle mobile + ERPICO brand intactos.

**Estilos en `sidebar.scss`:**
- `.o_erpico_module_brand` — botón del nombre del módulo con tokens ERPICO.
- `.o_navbar_breadcrumbs` — breadcrumbs con estilo muted, hidden en mobile.
- Media query mobile (`max-width:768px`) oculta `.o_erpico_module_brand` y `.o_navbar_breadcrumbs`.

### Archivos modificados
- `static/src/sidebar/navbar.xml` — template con brand, breadcrumbs, SectionsMenu
- `static/src/sidebar/sidebar.scss` — `.o_erpico_module_brand`, `.o_navbar_breadcrumbs`
- `specs/Bugs.md` — BUG-S-023 → Resuelto

### Estado al cierre
- Bugs S-001…S-023 resueltos.

---

## Sesión 2026-09-23 — Fix BUG-S-019 (flyout hover)

### Qué se hizo

**BUG-S-019:** el flyout se cerraba al mover el mouse desde el rail button hacia el flyout. El `t-on-mouseleave` del rail button iniciaba un timer de 180ms (`clearHover()`), pero el flyout no tenía `t-on-mouseenter` para cancelarlo → tras 180ms el flyout desaparecía, imposibilitando clickear submenús con mouse.

**Fix:**
- `sidebar.js`: nuevo método `_cancelHoverTimer()` que limpia `_clearHoverTimer` sin tocar `_hoverLock` ni `flyoutApp`.
- `sidebar.xml`: `t-on-mouseenter="() => this._cancelHoverTimer()"` agregado al div `.o_erpico_flyout` (línea 72).

### Archivos modificados
- `static/src/sidebar/sidebar.js` — `_cancelHoverTimer()`
- `static/src/sidebar/sidebar.xml` — `t-on-mouseenter` en flyout
- `specs/Bugs.md` — BUG-S-019 → Resuelto

### Estado al cierre
- Bugs S-001…S-019 resueltos.

---

## Sesión 2026-09-23 — Bug-hunt Fase 6: detección de bugs y riesgos (sin fix)

### Qué se hizo

Análisis de código + tests CDP nuevos sobre `sidebar_test` para **detectar** bugs y riesgos. Por directriz del usuario: **descubrir, no solucionar**. Todo documentado.

**Bugs nuevos detectados (Bugs.md):**
- **BUG-S-019 (Media):** flyout se cierra al mover el mouse dentro. Timer 180ms de `clearHover()` no cancelado por `mouseenter` del flyout (`sidebar.xml:72` / `sidebar.js`). Reproducido con probe CDP (`_probe_flyout.js`, mouse dentro flyout +600ms → flyout ausente).
- **BUG-S-020 (Media, test infra):** `cdp_layout.js`/`cdp_smoke.js` sin `page.setViewport` → heredan 800×600 (default Puppeteer) → sidebar `display:none` (`d-lg-flex` ≥992). Falsa alarma "sidebar oculto a 1024px". Verificado: viewport real 1024 → sidebar visible 60px, rail OK, R2 OK. `cdp_smoke.js` cuenta `.o_erpico_rail_btn` con `$$` (DOM, no visibilidad) → no prueba visibilidad.
- **BUG-S-021 (Media):** gap breakpoints 769-991px — sidebar oculto (`d-lg-flex`) Y toggle oculto (`max-width:768`) → **sin acceso a apps**. Reproducido (768/800/991/992/1024px probe).
- **BUG-S-022 (Baja):** drawer móvil itera solo `state.railApps`; `otherApps` (mass_mailing "Email Marketing", "Apps") inaccesibles en móvil. Probes: drawer 11 apps, allApps 13, rail 11.

**Diagnóstico confirmado:** layout test C12 era falso negativo; R2 real OK (1024px: sidebar flex 60px, action_manager margin 60px).

Archivos modificados: `specs/Bugs.md` (S-019..S-022), `specs/spec-web-sidebar-v1.md` §9.1 (riesgos R-M1..R-M3, R-L1..R-L6), `specs/TESTS_COVERAGE.md` (C12 + scripts), `readme/CHANGELOG.rst` (entrada QA Fase 6). Probes temporales eliminados.

### Apuntes cliente (2026-09-23) — anotados como bugs/mejoras

Feedback directo del jefe tras usar el módulo. Por directriz: **anotar, no implementar** (fixes en plan).

- **Apunte 1 → BUG-S-019 (ya abierto, Media).** "Es complejo ingresar a un apartado desde la barra lateral; al poner el mouse encima de una sección y querer entrar a un submenú, se va demasiado rápido y no permite seleccionar." Confirma el bug del flyout (timer 180ms de `clearHover` no cancelado por `mouseenter` del flyout). Reporte agregado a Bugs.md; fix propuesto (`t-on-mouseenter` cancelando timer) queda pendiente.
- **Apunte 2 → BUG-S-023 nuevo (mejora, Media) + D-28.** "Quisiera que al ingresar a un módulo de Odoo aún existiese (persista) la topbar; es mejor y más intuitivo conservar el menú del módulo." Aclarado con usuario: **falta el menú del módulo en la topbar** (brand + breadcrumbs + secciones que el patch de `web.NavBar` eliminó — quedaba solo logo + systray). Restaurar en `navbar.xml` conservando bloques core; AppsMenu no vuelve (el rail lo sustituye). Revierte parcialmente D-14.
- Verificación: al navegar a `/odoo/contacts` la topbar ERPICO SÍ persiste (no es bug de ocultamiento) — el issue es solo contenido (falta contexto del módulo).

---

## Sesión 2026-09-23 — Fase 5 cierre: matriz manual + regresión debranding

### Qué se hizo

**Matriz manual (spec §7.3) automatizada — `cdp/cdp_matrix.js`:**
- Usuarios reales creados en `sidebar_test` vía `odoo shell`: `ventas` (salesman, no-admin), `basic` (solo Internal User).
- Resultados: admin landing Dashboards ✅; ventas landing Dashboards ✅ (accede a la app → D-24) + rail filtrado 11 apps sin "Ajustes" ✅; basic landing Dashboards ✅ (app pública a internos). Fallback `super()` no observable: `spreadsheet_dashboard_menu_root` **sin grupos** → todo usuario interno accede. Drawer abre + SwitchCompany footer ✅; Escape cierra ✅; teclado rail enfocable ✅.
- Corrección de selector: toggle real es `.o_erpico_mobile_toggle` (navbar.xml:11).

**Regresión debranding — hallazgo BUG-S-017:**
- Ejecutada sobre `sidebar_test`: **2 FAIL + 1 ERROR de 22**:
  1. `test_login_debranded` (500): `QWebError Unallowed to fetch files from addon website ... Addon website is not installed`.
  2. `test_purchase_order_portal` (500): ídem con `website_sale`.
  3. `test_sale_order_portal` (ERROR): `NotNullViolation sale_order.picking_policy`.
- **Baseline:** BD `sidebar_baseline` = `pg_dump` de `sidebar_test` + desinstalar `erpico_web_sidebar` (no tiene tablas propias) → mismos fallos reproducidos **sin el sidebar** (3 FAIL + 1 ERROR; el extra `test_init_odoobot_neutral` es artefacto del clon sin filestore).
- **Conclusión:** fallos preexistentes del entorno/build Odoo 19 (20260908) — assets `web.assets_frontend` referenciando `website`/`website_sale` (check de "addon no instalado" en build) y campo `picking_policy` nuevo requerido en `sale.order`. El módulo solo inyecta `web.assets_backend`; **el sidebar NO rompe la suite** → riesgo 5 de la spec cubierto.
- *Acción BUG-S-017:* reportar a rama debranding; el sidebar lo documenta, no lo bloquea.

### Archivos modificados
- `cdp/cdp_matrix.js` — nuevo: matriz manual automatizada
- `specs/Bugs.md` — BUG-S-017 (abierto), sección resueltos reorganizada (detalle histórico consolidado en tabla)
- `specs/TESTS_COVERAGE.md` — §3 matriz ejecutada + regresión debranding con baseline
- `specs/Plan de Desarrollo.md` — Fase 5 checklist matriz/regresión [x], milestone M5 actualizado

### Pendiente
- C9: fullscreen report → sidebar oculta (requiere reporte con botón fullscreen de web).
- Fase 6: `spec-web-sidebar-v1.md` estado final + commit cierre + push.

---

## Sesión 2026-09-23 — Fase 5 ampliada: bug hunt + fixes S-013…S-016 + push

### Qué se hizo

**Push inicial al repo `https://github.com/Vankisito/Branding_web_sidebar.git`:**
- Análisis de archivos creados en Fase 5: scripts CDP y manifests SÍ son del repo; `node_modules` movido a `.gitignore`.
- `36d727f` incluyó `cdp/node_modules` (2274 archivos) por accidente → `git reset --soft`, creado `.gitignore` (`cdp/node_modules/`, `node_modules/`, `Thumbs.db`…), commit `7afe685` con `.gitignore` + `cdp/package.json` + `cdp/package-lock.json`.
- Push `c0c27c2..7afe685 master → master` — **12 commits** exitoso (la salida en rojo era stderr de PowerShell, no error).

**Verificación de marca ERPICO** (vs `C:\Users\Santi\Downloads\erpico_website-Desarrollo\erpico_website-Desarrollo`):
- Colores/tokens exactos: `#2c85c7`, `#1f6da8`, `#e99a55`, `#0c112e`, `#f7f9fb`, `#dfe8ef`, radius 8px.
- Fuentes Outfit + Work Sans self-hosted (woff2).
- Logos horizontal + favicon y **15 iconos `brand-*.svg`** con hash MD5 idéntico.
- Única diferencia: tokens success/danger (`#276b48`/`#b62c2c`) vs brand book (`#2E7D32`/`#D32F2F`) — **decisión del usuario: dejarlo como está**.

**Bug hunt (revisión de código + tests CDP):**
- **BUG-S-013 (Alta):** drawer móvil no cierra al navegar app/submenú. `_open()` no setea `drawerOpen=false`. `sidebar.xml:150,166`.
- **BUG-S-014 (Media):** hover flyout race — `hoverApp()` no cancela el timer; transición rápida cierra flyout (contradecía C3 ✅).
- **BUG-S-015 (Baja):** `toggleDrawer()` muerto y contradictorio (toggla y triggerea bus que fuerza `true`).
- **BUG-S-016 (Baja):** listener `MENUS:APP-CHANGED` en `setup()` sin `removeEventListener`.
- **R2:** verificado sin acumulación de margin-left (cdp_layout.js). Nota: `.o_main` no existe en Odoo 19; medición correcta vía rail/action_manager/content. Sidebar `display:none` a 1024px es del entorno (d-lg-flex Odoo), no del módulo.
- **R3/R4 fuera de alcance** (decisión usuario): NavBar template replace, a11y drawer.

**Fixes (commit `dcf20e1`):**
- S-013: `_open()` ahora setea `drawerOpen = false`.
- S-014: `hoverApp()` cancela `_clearHoverTimer` antes de setear flyout.
- S-015: `toggleDrawer()` eliminado.
- S-016: listener `MENUS:APP-CHANGED` removido.

**Tests (nuevos scripts CDP en `cdp/`):**
- `cdp_drawer_nav.js` → ✅ drawer cierra al navegar (S-013 verificado).
- `cdp_hover.js` → ⚠️ Puppeteer 25 no puede simular hover fiable en rail re-renderizado (`state.ready`); S-014 verificado por review + fix en código.
- `cdp_layout.js` → ✅ sin acumulación margin (C12).
- `cdp_allapps.js` → ⚠️ misma limitación Puppeteer para click tras re-render; panel se valida manualmente.
- Regresión completa: `cdp_smoke.js` ✅ (0 errores, 12 botones, landing Dashboards), `cdp_drawer.js` ✅, `cdp_settings.js` ✅.

### Archivos modificados
- `static/src/sidebar/sidebar.js` — fixes S-013…S-016
- `cdp/cdp_drawer_nav.js`, `cdp/cdp_hover.js`, `cdp/cdp_layout.js`, `cdp/cdp_allapps.js` — nuevos scripts de test
- `.gitignore`, `cdp/package.json`, `cdp/package-lock.json`
- `specs/Bugs.md`, `specs/TESTS_COVERAGE.md`, `specs/Changelog.md`

### Commits
- `dcf20e1` — fix(sidebar): S-013 drawer cierra al navegar, S-014 hover race, S-015 toggle muerto, S-016 listener
- `e56a131` — test(cdp): fix hover (mouse.move), layout (wait 6s), allapps (mouse click)
- `5bd447b` — test(cdp): force: true para clicks (evita "not clickable")

### Pendiente
- Fase 5: matriz manual completa + regresión debranding (`erpico_debranding` con sidebar instalado).
- Fase 6: docs finales (`CHANGELOG.rst`, spec §estado) + push de nuevos commits.

---

## Sesión 2026-09-23 — Fases 0–1 completadas (stack Docker + bugs críticos)

### Qué se hizo

**Fase 0 — Entorno Docker (D-21):**
- `compose.test.yml` en la raíz del **repo** (`erpico_web_sidebar/compose.test.yml`): `odoo_sidebar_test` (8071:8069, Dockerfile `odoo:19` + pypdf) + `db_sidebar_test` (postgres:17, 5440:5432), volúmenes propios (`../Custom_addons/...` porque `Custom_addons` es hermano del repo), DB `sidebar_test`, command instalando los módulos + `mass_mailing`.
- Proxy Docker roto (`http.docker.internal:3128` no resuelve) → `HTTP(S)_PROXY=http://host.docker.internal:3128` para `pull`.
- Stack up; smoke `GET /web/login` → 200.
- Instalados módulos extra para ejercicio real del rail: `contacts,crm,sale,website,website_sale,calendar,spreadsheet_dashboard,point_of_sale,purchase,stock,account`.
- **`mass_mailing`** añadido al stack de test (instala limpio; 113 módulos cargados) para cobertura de QA futura.

**Fase 1 — Bugs críticos + limpieza:**
- **BUG-S-001:** `git checkout -- static/src/sidebar/sidebar.xml` (144 líneas M2 restauradas).
- **BUG-S-003:** `useService("bus")` eliminado → `this.env.bus`.
- **BUG-S-002:** `static/src/sidebar/landing_patch.js` (nuevo) — patch módulo de `WebClient.prototype._loadDefaultApp`, gate por **presencia** de Dashboards (D-24). Fracasó v1 (hasGroup flaky en boot) y el debug reveló la causa REAL: el bundle no se regeneraba → **D-23** (restart obligatorio).
- `navbar.js`: bloque M3 roto eliminado; queda solo `patch(NavBar, { template })`.
- Borrado `_patch.js` (huérfano).
- `__manifest__.py`: `category='Productivity'`, `data: []`, assets indentados + `landing_patch.js`.
- `APP_MAP` D-20 (13 apps) con xmlids **corregidos y confirmados** runtime: `crm.crm_menu_root` (no `menu_crm_root`), `website.menu_website_configuration` (no `menu_website_root`), `calendar.mail_menu_calendar` (no `menu_calendar`). `sale.sale_menu_root` y `website_sale.menu_ecommerce` existen pero no son apps root → rail 12/13.
- Ajustes/Cambiar empresa → `_resolveLeaf` + `action.doAction("base.action_res_companies")`.

**Test/Pendientes resueltos en esta sesión:**
- BUG-S-009: `menuService.reload()` existe (fuente core), guard eliminado.
- BUG-S-010: manifest limpio, `-u` sin warnings.
- Mysterious log `click .o_app[data-menu-xmlid="crm.crm_menu_root"]` → **tour** de `web_tour` (core) que se auto-ejecuta al primer login (stack trace vía CDP `Runtime.consoleAPICalled`). Inofensivo, no es código nuestro.

### Tests (CDP Edge headless — `cdp_smoke.js`)
Login admin → **URL final `/odoo/dashboards?dashboard_id=3`** (landing Dashboards OK). **0 errores de consola.** Rail visible con **12 botones**, navbar `.o_main_navbar` presente.

Evidencia de instrumentación temporal (`[LANDING]`): `apps=12 hasApps=true firstId=83 firstXmlid=mail.menu_root_discuss` → `selectMenu(183)` → `selected OK`.

### Pendiente
- **Fase 2** — M4 drawer + footer: S-004 (listener `erpico:open-drawer`), S-005 (template+SCSS drawer), S-006 (`SwitchCompanyMenu` real), S-007 (xmlid Ajustes ya confirmado; `goToSettings` OK).
- Fases 3–6 restantes. Al editar JS: ver D-23 (restart para refrescar bundle).
- **Push al repo `Branding_web_sidebar`** realizado: commits `b2f81a4` + `feb992a` en `origin/master` (2026-09-23).
- **Bug encontrado y corregido en compose.test.yml**: `--addons-path=/mnt/extra-addons` sola sombrea los módulos stock de Odoo (ej. `mass_mailing`). Corrección: `--addons-path=/mnt/extra-addons,/usr/lib/python3/dist-packages/odoo/addons`. Sin esto, `docker compose up -i mass_mailing` falla al instalar.
- **Infraestructura separada del módulo**: `compose.test.yml` y `Dockerfile` NO forman parte del repo del módulo `Branding_web_sidebar`. Se movieron a la raíz del proyecto (`Odoo 19 test Debranding/compose.test.yml`), fuera del repo, como herramienta de QA local. El módulo es portable: se instala en CUALQUIER BD Odoo 19 con `-u erpico_web_sidebar`.
- **Dependencia `spreadsheet_dashboard`** añadida a `__manifest__.py`: el landing admin → Dashboards (D-10/D-24) requiere la app Dashboards instalada. Sin ella, `landing_patch.js` cae a `super()` (comportamiento graceful).

---

## Sesión 2026-09-23 — Fase 2+4 (BUG-S-012, S-011a, S-011b)

### Qué se hizo

**BUG-S-012 (Ajustes móvil):** `goToSettings()` en `sidebar.js` usaba `this.menuService.getMenu("base.menu_administration")` — método que **no existe** en el API del menu service de Odoo 19 (métodos válidos: `getApps()`, `getMenuAsTree(id)`). Fix: buscar el app por `xmlid` desde `[...this.state.railApps, ...this.state.otherApps]` que ya tienen `_childrenTree` poblado en `onWillStart`. Navegación a Settings ahora funciona en móvil.

**S-011a (fullscreen-hide):** Listener `env.bus "ACTION_MANAGER:UI-UPDATED"` en `Sidebar.setup()` → `_onUIUpdated(env)` → `state.fullscreenHidden = env.mode === "fullscreen"`. CSS `.o_erpico_sidebar-fullscreen-hidden { display: none !important }`. Template `sidebar.xml` usa `t-att-class` para condicionar la clase.

**S-011b (a11y):**
- `clearHover()` con `setTimeout(..., 180)` (cancelable via `_clearHoverTimer`), `_hoverLock` para prevenir race conditions
- `_openFlyout(app)` / `_closeFlyout()` para gestión de hover con teclado
- `_onRailKeydown(app, ev)` — ArrowRight/ArrowDown abren flyout, Escape cierra
- `t-on-keydown` en botones del rail en `sidebar.xml`
- `selectApp`/`openItem`/`toggleAllApps`/`_closeDrawer` resetean `_hoverLock` y limpian timer
- `:focus-visible` outline visible en `.o_erpico_rail_btn` y `li` del drawer
- `onWillUnmount` limpia `_clearHoverTimer`

### Archivos modificados
- `static/src/sidebar/sidebar.js` — goToSettings fix, fullscreen listener, a11y delay/keyboard
- `static/src/sidebar/sidebar.xml` — `t-att-class` fullscreen, `t-on-keydown` en rail buttons
- `static/src/sidebar/sidebar.scss` — `.o_erpico_sidebar-fullscreen-hidden`, `:focus-visible` outlines
- `specs/Bugs.md` — BUG-S-012 → Resuelto, BUG-S-011 actualizado

### Pendiente
- `readme/CHANGELOG.rst` (fragment OCA) — BUG-S-011
- Tests QUnit/tour — BUG-S-011
- Fase 5 QA CDP completa + matriz manual + regresión debranding
- Fase 6 docs + commits

---

## Sesión 2026-09-23 — Fase 3 (docs spec) + Fase 4 verificación

### Qué se hizo

**Fase 3 — Actualización docs spec:**
- `spec-web-sidebar-v1.md` §2: añadidas D-20, D-23, D-24 a tabla de decisiones
- `spec-web-sidebar-v1.md` §5.4: tabla de mapeo reemplazada con xmlids D-20 **confirmados runtime** (13 apps; `sale.sale_menu_root` y `website_sale.menu_ecommerce` no son app root → rail 12/13)
- `spec-web-sidebar-v1.md` §5.8: `margin-left` cubierto con `.o_main, .o_action_manager, .o_content`; `.o_erpico_sidebar-fullscreen-hidden` documentado
- `spec-web-sidebar-v1.md`: estado actualizado a "Implementación Fases 0–4 ✅"
- `Plan de Desarrollo.md`: Fase 3 §5.4 marcada ✅, Fase 4 checklist completa

**Fase 4 — Verificación:**
- Margin-left: selectores amplios `.o_main/.o_action_manager/.o_content` para cobertura ante build Odoo 19
- `patch(NavBar, { template })`: solo reemplaza template, métodos (`adapt()`, breadcrumbs) inalterados por D-18 (solo patches)
- BUG-S-011 actualizado: S-011a/S-011b ✅ completos; pendiente `readme/CHANGELOG.rst`, QUnit/tour

### Commits
- `26dbc28` — fix sidebar (BUG-S-012 + S-011a + S-011b)
- `ca55e03` — docs spec (Fase 3 §2+§5.4 + Fase 4 verificación)

### Pendiente
- **BUG-S-011 resuelto** (29fa4bb): `readme/CHANGELOG.rst` OCA fragment creado, `margin-left` selectores amplios, QUnit/tour → v2 fuera de alcance
- Fase 5 QA CDP + matriz manual + regresión debranding (requiere Docker Desktop)

---

## Sesión 2026-09-23 — Fase 5: QA CDP

### Qué se hizo
- **BUG-S-004 (toggle móvil):** `Sidebar.setup()` escucha `env.bus "erpico:open-drawer"` → `_openDrawer()`. `onWillUnmount` limpia el listener. `toggleDrawer()` solo dispara el bus.
- **BUG-S-005 (drawer M4):** Template drawer + backdrop en `sidebar.xml` (`t-if="state.drawerOpen"`):
  - Drawer panel: logo ERPICO, acordeón de apps con `childrenTree`, footer con `SwitchCompanyMenu` + botón Ajustes.
  - Backdrop: overlay con `click`→cierra drawer.
  - **Escape** cierra drawer/flyout/allApps (`window.keydown` en `onMounted`, cleanup en `onWillUnmount`).
- **BUG-S-006 (Cambiar empresa):** eliminado `goToCompany()`. `SwitchCompanyMenu` real (`@web/webclient/switch_company_menu/switch_company_menu`) renderizado en footer del drawer.
- **BUG-S-007 (Ajustes):** `goToSettings()` ya usaba `_resolveLeaf(getMenu("base.menu_administration"))` — pendiente verificar runtime móvil (S-012).
- **fix escapar XML:** `&&` en `t-if` → `&amp;&amp;` (XML parse error `xmlParseEntityRef`).
- **fix `_openDrawer` bind:** el handler por EventBus perdía `this` (componente); bind en setup.
- **fix Escape:** keydown bubble no llegaba a window (stopPropagation Odoo en capture); `addEventListener("keydown", fn, true)` capture phase lo resuelve.
- **sidebar.scss:** `.o_erpico_backdrop`, `.o_erpico_drawer`, `.o_erpico_drawer_*` con transiciones 300ms (chalk/obsidian).
- **sidebar.js:** importa `SwitchCompanyMenu`, `static components`, `onMounted`/`onWillUnmount`, `_openDrawer`/`_closeDrawer`/`_onKeyDown`.

### Tests
- **CDP drawer móvil (375px)** — `cdp_drawer.js`: toggle encontrado ✓, drawer abre ✓ (backdrop, 11 apps, 36 subitems, footer, Ajustes, SwitchCompanyMenu `My Company` como `.o-dropdown`), backdrop cierra ✓, **0 errores consola**.
- **Escape fix (bug real encontrado):** keydown en bubble NO llega a window (Odoo hace stopPropagation en capture). Fix: `window.addEventListener("keydown", fn, true)` fases capture → CDP `rawKeyDown` cierra drawer ✓ (`cdp_settings.js`: `drawerOpenAfterRawEsc: false`).
- **Pendiente S-012:** Ajustes no navega en móvil (URL queda en dashboards, body 43 chars). Ver BUG-S-012.

### Pendiente
- **S-012: debug Ajustes móvil** (dump `getMenu("base.menu_administration")` runtime, comparar desktop).
- CDP: validar drawer viewport 375px completo (navegación app desde drawer), switch company dropdown abre.
- Fase 3: APP_MAP confirmación.
- Fase 4: hardening S-009...S-011.

---

## Sesión 2026-09-23 — Fases 0–1 completadas (stack Docker + bugs críticos)

### Qué se hizo
Auditoría completa del módulo (1 commit `7091cf9` + working tree sucio) contra
la spec v1 y el código fuente de Odoo 19 en GitHub (`webclient.js`,
`navbar.js`/`navbar.xml` verificados). Resultado: **M0–M1 a medias, M2
regresionado, M3 roto, M4 incompleto, M5 inexistente**.

Se detectaron **11 bugs** (3 críticos) y se registran en `specs/Bugs.md` con
prefijo `BUG-S-` (evita colisión con la suite `erpico_debranding`).

**Bugs críticos:**
- BUG-S-001: `sidebar.xml` vaciado (rail/flyout/allApps borrados sin commit) → sidebar no renderiza.
- BUG-S-002: parche M3 `_loadDefaultApp` inviable (WebClient no global + `arguments.callee` en strict mode + timing 2s + `hasGroup` = Promise sin await).
- BUG-S-003: `useService("bus")` no existe en Odoo 19 → `Sidebar.setup()` crashea.

**Bugs altos:** toggle mobile sin listener (S-004), drawer sin template/SCSS (S-005), `goToCompany` con evento fantasma (S-006).
**Menores:** `goToSettings` sin `_resolveLeaf`/xmlid por confirmar (S-007), `APP_MAP` fuera de spec D-19 (S-008), `menuService.reload()` por verificar (S-009), manifest/archivos muertos (S-010), pendientes a11y/fullscreen/tests/CHANGELOG (S-011).

**Decisión de entorno:** nuevo stack Docker de test propio (D-21) — `compose.test.yml`, puerto 8071/5440, DB `sidebar_test`. Docker Desktop estaba apagado.

**Decisiones de producto (usuario):**
- Restaurar `sidebar.xml` desde git (regresión, no refactor intencional).
- **D-20**: rail = D-19 + **Discuss + Calendario + Ajustes**; quitar `base.menu_management`. (Cliente olvidó esos 3 módulos — documentado.)
- **D-21**: stack Docker separado para tests.
- **D-22**: QA = CDP Edge headless + matriz manual (sin QUnit v1).

**Plan de acción acordado (6 fases):** 0) stack Docker → 1) bugs críticos S-001/S-003/S-002 → 2) M4 drawer + footer S-004/S-005/S-006 → 3) APP_MAP D-20 + dump xmlids → 4) hardening S-007…S-011 → 5) QA CDP + manual + regresión debranding → 6) docs + commits por fase.

**Archivos creados (esta sesión):**
- `specs/Bugs.md` — bitácora con BUG-S-001…011 abiertos.
- `specs/Decisiones.md` — D-10…D-22 (D-10…D-19 replicados de la spec + D-20/D-21/D-22 nuevas).
- `specs/Changelog.md` — este archivo.
- `specs/Plan de Desarrollo.md` — plan 6 fases con checklists.
- `specs/TESTS_COVERAGE.md` — inventario inicial (sin tests aún).

### Tests
- No aplica (solo documentación; código sin tocar).

### Pendiente
- Ejecutar Fases 0–6 del plan.
- Restaurar `sidebar.xml` y confirmar `git status` limpio antes de codar.

---

## Sesión 2026-09-22 — Estado inicial (commit `7091cf9` "initial")

### Qué se hizo
- Skeleton M0 completo: manifest `19.0.1.0.0`, assets (iconos brand ×16, ui-sprite, fonts Outfit/Work Sans, logo + favicon), readme fragments (DESCRIPTION/USAGE/CONTRIBUTORS), spec `spec-web-sidebar-v1.md` + mockup.
- M1: `navbar.js` (`patch(NavBar, {template})`) + `navbar.xml` (brand + systray) + scss topbar.
- M2: `sidebar.js` (APP_MAP parcial, rail/flyout/allApps en template) + `sidebar.scss` (tokens, rail, flyout, allApps, margin-left).
- `views/webclient_templates.xml` (herencia descartada en Odoo 19 → solo comentario).
- Spec con decisiones D-10…D-19 y milestones M0–M5.

### Estado al cierre
- Sin validar en runtime (sin Docker/CDP).
- Working tree posteriores al commit dejó M2 vaciado (→ BUG-S-001) y M3/M4 a medias (→ BUG-S-002…006). Ver auditoría 2026-09-23.

### Tests
- Ninguno.

---

## Sesión 2026-09-23 — Fase 6 cierre: docs finales + C9 fullscreen + tests CDP completados

### Qué se hizo

**Fase 6 documental (commit `9c359ce`, push `71e7094..9c359ce`):**
- `spec-web-sidebar-v1.md`: §8 Milestones M0–M5 marcados ✅ con evidencia; §9 Riesgos 1–6 cerrados (xmlids/settings/SwitchCompany/iconos/debranding/dashboards verificados).
- `Decisiones.md`: **D-26** (tokens success/danger se mantienen, decisión de cliente) y **D-27** (BUG-S-017 = fallo de entorno, no bloquea el módulo).
- `CHANGELOG.rst`: bump a **19.0.1.0.2** + fixes S-013…S-016 + QA Fase 5.
- `__manifest__.py`: versión `19.0.1.0.0` → `19.0.1.0.2`.

**C9 Fullscreen test (`cdp/cdp_fullscreen.js`) — descubrió BUG-S-018:**
- Camino real: `/odoo/action-567` (la única action window `target=fullscreen` del stack, *rg* "Pick a Theme" → modelo `ir.module.module` kanban). Core entra en fullscreen real (`.o_main_navbar` desaparece), pero el sidebar **seguía visible**.
- Causa: `_onUIUpdated(env)` leía `env.mode`; OWL `EventBus.trigger(name, payload)` empaqueta el payload en `CustomEvent.detail` (owl.js:330), y el core `webclient.js` desestructura `({ detail: mode })`. `env.mode` → `undefined` → `fullscreenHidden` siempre `false` (S-011a muerto).
- Fix: `_onUIUpdated(evt)` lee `evt.detail`, replicando el patrón del core (`if (mode !== "new") … mode === "fullscreen"`).
- Verificado: fullscreen → sidebar `display:none` (class `o_erpico_sidebar-fullscreen-hidden`); navegar a `/odoo` → restaura. **C9 green.**

**Q2 — tests CDP hover/allapps reparados:**
- Raíz: `ElementHandle.hover({force:true})` / `.click({force:true})` fallaban ("Node is either not clickable or not an Element") por bounding box con re-render `state.ready`.
- Fix: interacción por coordenadas reales (`getBoundingClientRect` + `page.mouse.move/click`), viewport 1600×900 explícito.
- `cdp_hover.js` ahora **green** (flyout abre/rebota entre apps, mouseleave cierra) — C3 ya no es "por review".
- `cdp_allapps.js` ahora **green** (13 apps, 0 sin icono, cierra al clic, rail 11 apps + footer = 12 total).
- Nota C6: rail=11 apps porque `website_sale.menu_ecommerce` (13º del APP_MAP) no es menú raíz en `load_menus` — consistente con S-008.

**Regresión CDP completa tras fix S-018:** smoke, drawer, settings, drawer_nav, layout, matrix → todos verdes.

### Archivos modificados
- `static/src/sidebar/sidebar.js` — fix `_onUIUpdated` (BUG-S-018)
- `cdp/cdp_fullscreen.js` — nuevo (C9 / S-011a / S-018)
- `cdp/cdp_hover.js`, `cdp/cdp_allapps.js` — interacción por coordenadas reales
- `specs/Bugs.md` — BUG-S-018 resuelto
- `specs/TESTS_COVERAGE.md` — C3/C6/C9 actualizados a ✅, §2A con cdp_fullscreen
- `specs/Changelog.md`, `specs/Decisiones.md` (D-26, D-27), `specs/spec-web-sidebar-v1.md`, `readme/CHANGELOG.rst`, `__manifest__.py` — cierre Fase 6

### Estado al cierre
- Fases 0–6 completas. Tests CDP: **C1–C12 verdes**. Bugs S-001…S-018 resueltos. S-017 documentado (entorno, rama debranding).
- Working tree limpio tras commit + push (9c359ce).
## Sesión 2026-09-26 — Rail por entradas (D-29…D-30), Home para todos (D-33), Marketing agrupado (D-32)

### Qué se hizo

1. **Rail = entradas, no apps** (D-29/D-30). Nuevo `static/src/sidebar/nav_entries.js` con
   `NAV_MAP` (10 entradas en el orden pedido por el cliente), `HOME_CARDS`, `buildMenuIndex()`,
   `resolveEntries()`, `resolveHomeCards()`, `resolveLeaf()`, `buildAppIcons()`. Cada entrada
   declara secciones con xmlids candidatos; gana el primero presente en `menuService.getAll()`.
2. **Auditoría de xmlids contra `odoo/odoo` 19.0** (no sólo runtime):
   - `sale.sale_menu_root` está declarado con `active="False"` → nunca aparece en `getApps()`;
     por eso Ventas usa la cadena `sale.sale_menu_root` → `sale.menu_sale_order` →
     `sale.menu_sale_quotations`.
   - El módulo `product` **no define ningún `<menuitem>`** en v19; Productos cuelga de Inventario
     (`stock.menu_product_inventory_control` → `stock.menu_product_variant_config_stock`).
   - Email/SMS Marketing son dos apps distintas (`mass_mailing` seq 115, `mass_mailing_sms` seq 120).
   - `menuService.getMenu(id)` sólo acepta id numérico → el índice por xmlid se hace con `getAll()`.
3. **Sidebar filtrado por permisos** (D-30): `load_menus` ya aplica grupos + `active_test`, así que
   la presencia del xmlid ES el permiso. Sin `hasGroup()`. Drawer, flyout, all-apps y home usan la
   misma lista → **mitiga BUG-S-022** (el drawer ya no queda fuera Marketing Email/SMS); sigue
   abierto que el panel all-apps cuelgue del `<nav>` del rail (`d-none d-lg-flex`) y no sea
   alcanzable en móvil.
4. **Home de ERPICO** (D-33): `views/home.xml` (menu root `menu_home_root` con `sequence=1` +
   `ir.actions.client` `erpico_web_sidebar_home`), `static/src/sidebar/home.js|xml|scss`. Se
   registra en `registry.category("actions")` (en v19 `_executeClientAction` monta el Component si
   `clientAction.prototype instanceof Component`). v1 renderiza **sólo 2 cards** (Dashboards, CRM).
   El landing deja de necesitar patch: `apps[0]` es el home.
5. **Marketing Email/SMS** (D-32): una entrada, dos grupos en el flyout; cada grupo se oculta si su
   app no está accesible. Mismo comportamiento en el drawer (`.o_erpico_drawer_group`).
6. **Fuera del rail** (D-31): Contactos, Facturación, Discuss, Calendario y Ajustes quedan sólo en
   el panel "Todas las aplicaciones". `goToSettings()` resuelve `base.menu_administration` por xmlid.
7. **Icono nuevo** `static/src/icons/brand-productos.svg` (mismo estilo que el resto: 24×24,
   `stroke="#72b9ff"`, `stroke-width="1.45"`).
8. **Limpieza:** eliminado `views/webclient_templates.xml` (vacío y fuera de `data`).
9. **Tests:** `static/tests/nav_entries.test.js` (hoot, `@odoo/hoot`) agregado a
   `web.assets_unit_tests`. `cdp/cdp_allapps.js` ahora valida el **orden** de las entradas por
   `aria-label`. Nuevo `cdp/cdp_home.js` (landing = home, 2 cards, navegación de cada card).
10. `__manifest__.py` → `19.0.1.1.0`, `data: ["views/home.xml"]`.

### Archivos creados/modificados

- Creados: `static/src/sidebar/nav_entries.js`, `static/src/sidebar/home.js`,
  `static/src/sidebar/home.xml`, `static/src/sidebar/home.scss`, `static/src/icons/brand-productos.svg`,
  `views/home.xml`, `static/tests/nav_entries.test.js`, `cdp/cdp_home.js`.
- Modificados: `__manifest__.py`, `static/src/sidebar/sidebar.js`, `static/src/sidebar/sidebar.xml`,
  `static/src/sidebar/sidebar.scss` (`.o_erpico_drawer_group`), `static/src/sidebar/landing_patch.js`,
  `cdp/cdp_allapps.js`, `specs/Decisiones.md` (D-29…D-33), `specs/spec-web-sidebar-v1.md` (§5.1, §5.2,
  §5.4, §5.5, §5.6, §9.1 + §9.2b riesgos nuevos), `specs/Bugs.md` (BUG-S-022 reformulado),
  `specs/TESTS_COVERAGE.md` (§2B), `readme/USAGE.rst`, `readme/CHANGELOG.rst` (19.0.1.1.0).
- Eliminado: `views/webclient_templates.xml`.
- Fix: el fallback de `landing_patch.js` caía al dashboard cuando el home ya era `apps[0]` (el
  bucle seguía con el candidato siguiente), de modo que el landing ignoraba el home. Ahora el home
  manda: si ya es la primera app se deja actuar al core, si no se selecciona explícitamente, y sólo
  sin home se prueba Dashboards.

### Verificación

- `node --check` en los 5 JS nuevos/modificados + `cdp_home.js` y `cdp_allapps.js`: OK.
- Lógica de resolución ejecutada en Node contra un `menuService` simulado (12 asserts): orden,
  filtrado por permisos, fallback de Ventas, grupos de Marketing, `resolveLeaf` profundo/sin acción,
  cards del home, iconos: **todo OK**.
- XML parseado (`views/home.xml`, `sidebar.xml`, `home.xml`, `navbar.xml`) y `__manifest__.py` con
  `ast.literal_eval`: OK.
- **Pendiente de runtime:** docker está apagado en esta sesión → falta CDP real (`cdp_home.js`,
  `cdp_allapps.js`, `cdp_matrix.js` con usuario sin POS, `cdp_fullscreen.js`, `cdp_drawer_nav.js`) y
  el arranque de Odoo con el menú nuevo (recordatorio D-23: reiniciar el contenedor tras editar JS).

### Estado al cierre

- Funcionalidad implementada y verificada a nivel estático/simulado; falta validación en navegador.
- Ningún commit realizado (esperando orden explícita).

---