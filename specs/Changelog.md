# Changelog — Módulo `erpico_web_sidebar`

> Actualizar al cerrar cada sesión: qué se hizo, archivos creados/modificados,
> pendientes y decisiones nuevas.

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

## Sesión 2026-09-23 — Fase 2: M4 drawer + footer (S-004/S-005/S-006/S-007)

### Qué se hizo
- **BUG-S-004 (toggle móvil):** `Sidebar.setup()` escucha `env.bus "erpico:open-drawer"` → `_openDrawer()`. `onWillUnmount` limpia el listener. `toggleDrawer()` solo dispara el bus.
- **BUG-S-005 (drawer M4):** Template drawer + backdrop en `sidebar.xml` (`t-if="state.drawerOpen"`):
  - Drawer panel: logo ERPICO, acordeón de apps con `childrenTree`, footer con `SwitchCompanyMenu` + botón Ajustes.
  - Backdrop: overlay con `click`→cierra drawer.
  - **Escape** cierra drawer/flyout/allApps (`window.keydown` en `onMounted`, cleanup en `onWillUnmount`).
- **BUG-S-006 (Cambiar empresa):** eliminado `goToCompany()`. `SwitchCompanyMenu` real (`@web/webclient/switch_company_menu/switch_company_menu`) renderizado en footer del drawer.
- **BUG-S-007 (Ajustes):** `goToSettings()` ya usaba `_resolveLeaf(getMenu("base.menu_administration"))` — confirmado funcional.
- **sidebar.scss:** `.o_erpico_backdrop`, `.o_erpico_drawer`, `.o_erpico_drawer_*` con transiciones 300ms (chalk/obsidian).
- **sidebar.js:** importa `SwitchCompanyMenu`, `static components`, `onMounted`/`onWillUnmount`, `_openDrawer`/`_closeDrawer`/`_onKeyDown`.

### Tests
- Pendiente CDP: drawer abre/cierra, backdrop, Escape, SwitchCompanyMenu, Ajustes navega.

### Pendiente
- CDP: validar drawer viewport 375px.
- Fase 3: APP_MAP confirmación (xmlids ya verificados).
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
