# Decisiones Técnicas — Módulo `erpico_web_sidebar`

> Registrar aquí toda decisión técnica o de diseño no obvia. Incluir: qué se
> decidió, por qué, quién lo aprobó y cuándo. Evita repetir conversaciones ya
> resueltas.

> **Nota:** D-10 … D-19 nacieron en `spec-web-sidebar-v1.md` (diseño aprobado
> 2026-09-22). Se replican aquí como fuente única de decisiones; ante conflicto,
> manda este archivo.

---

## D-10 — Landing admin = app nativa Dashboards (`spreadsheet_dashboard`)

**Fecha:** 2026-09-22
**Decidido por:** cliente (jefe) vía spec

**Decisión:** El administrador aterriza en la app **Dashboards** nativa de Odoo (`spreadsheet_dashboard`) tal cual. NO se replica el dashboard del mockup del jefe (KPIs/gráficos/tabla quedan para un módulo futuro).

**Consecuencias:**
- Patch de `WebClient._loadDefaultApp` (implementación: ver BUG-S-002).
- Si `spreadsheet_dashboard` no está instalado → fallback al comportamiento core.
- No-admin: comportamiento core (primera app por sequence).

---

## D-11 — Iconos del rail = SVG brand ERPICO

**Fecha:** 2026-09-22

**Decisión:** Iconos de app del rail = SVG de la carpeta de assets de marca (`static/src/icons/brand-*.svg`). Apps sin icono brand dedicado → sprite UI (`ui-sprite.svg`) o `webIconData` nativo; fallback final `i-grid`.

---

## D-12 — Rail muestra solo apps mapeadas E instaladas

**Fecha:** 2026-09-22

**Decisión:** El rail renderiza únicamente las apps cuyo xmlid exista en `APP_MAP` **y** esté instalada en la BD. Apps no mapeadas son accesibles desde "Todas las aplicaciones".

---

## D-13 — Flyout = submenús reales de menús

**Fecha:** 2026-09-22

**Decisión:** El flyout muestra el árbol real vía `menuService.getMenuAsTree(app.id).childrenTree`; clic → `menuService.selectMenu(item)` (misma API que el core). Nada de menús hardcodeados.

---

## D-14 — Systray de Odoo intacto

**Fecha:** 2026-09-22

**Decisión:** La topbar mínima conserva el systray completo de Odoo (buscador, notificaciones, usuario, debug). Se reemplaza el template del componente `NavBar` (patch), no el componente. Ver BUG-S-011 sobre efectos colaterales posibles (`adapt`, breadcrumbs).

---

## D-15 — Ajustes + Cambiar empresa duplicados en footer del rail

**Fecha:** 2026-09-22

**Decisión:** Footer del rail (y del drawer mobile) con atajos a **Ajustes** y **Cambiar de empresa**. Cambiar empresa = renderizar el componente real `SwitchCompanyMenu` del core (no duplicar lógica). Ver BUG-S-006 (implementación pendiente/correcta).

---

## D-16 — Fuentes de marca embebidas

**Fecha:** 2026-09-22

**Decisión:** Outfit (títulos) + Work Sans (cuerpo) embebidas en `static/src/fonts/*.woff2` (OFL). No se cargan desde CDNs.

---

## D-17 — Módulo separado autocontenido

**Fecha:** 2026-09-22

**Decisión:** Todo lo del sidebar vive en `erpico_web_sidebar` (specs propias en `specs/`), independiente de `erpico_debranding`.

---

## D-18 — Estrategia OCA: solo herencia/overrides, jamás editar core

**Fecha:** 2026-09-22

**Decisión:** Cambios solo por herencia de template (`t-inherit`), registry (`main_components`) y `patch()` de componentes/métodos. Todo revertible con `-u` / desinstalando el módulo. Sin tocar el seed.

---

## D-19 — Apps objetivo v1 del rail (spec original)

**Fecha:** 2026-09-22 · ⚠️ **ampliada por D-20**

**Decisión:** Rail v1: Contactos, CRM, Ventas, POS, Website, E-commerce, Compras, Facturación, Inventario (+ Dashboards).

---

## D-20 — Rail v1.1 = D-19 + Discuss + Calendario + Ajustes (quita Management)

**Fecha:** 2026-09-23
**Decidido por:** usuario (Santi) — "olvidé esos módulos, hay que agregarlos; documenta esto"

**Decisión:** El `APP_MAP` del rail pasa a (orden) — *xmlids **confirmados** en runtime contra `menuService.getApps()` (2026-09-23):*

| # | App | xmlid | Icono |
|---|---|---|---|
| 1 | Dashboards | `spreadsheet_dashboard.spreadsheet_dashboard_menu_root` ✅ | `i-dashboard` (sprite) |
| 2 | Contactos | `contacts.menu_contacts` ✅ | `i-building` (sprite) |
| 3 | CRM | `crm.crm_menu_root` ✅ | `brand-clientes-reportes` |
| 4 | Ventas | `sale.sale_menu_root` ⚠️ **existe pero NO es app root** en `load_menus` (res 278, action None, 0 grupos) → no entra al rail | `brand-pedidos-devoluciones` |
| 5 | Punto de venta | `point_of_sale.menu_point_root` ✅ | `brand-punto-de-venta` |
| 6 | Compras | `purchase.menu_purchase_root` ✅ | `brand-compras` |
| 7 | Facturación | `account.menu_finance` ✅ | `brand-facturacion` |
| 8 | Inventario | `stock.menu_stock_root` ✅ | `brand-inventario-ubicacion` |
| 9 | Sitio web | `website.menu_website_configuration` ✅ (no `menu_website_root`) | `i-globe` (sprite) |
| 10 | E-commerce | `website_sale.menu_ecommerce` ✅ (submenú de Sitio web; no app root → rail 12/13) | `brand-ecommerce-integrado` |
| 11 | **Discuss** | `mail.menu_root_discuss` ✅ | `i-bell` (sprite) |
| 12 | **Calendario** | `calendar.mail_menu_calendar` ✅ (no `menu_calendar`) | sprite `i-calendar` |
| 13 | **Ajustes** | `base.menu_administration` ✅ | `i-settings` (sprite) |

**Se elimina del rail:** `base.menu_management` (Apps/Marketplace — no deseado).

**Razón:** El cliente olvidó Discuss, Calendario y Ajustes en D-19; son apps de uso diario. Ajustes también vive en footer (D-15) — si hay duplicación rail+footer, evaluar quitar del footer al confirmar en UI.

**Consecuencias:**
- `APP_MAP` en `sidebar.js` ya actualizado con estos xmlids (Ajustes también va por `_resolveLeaf`, ver BUG-S-007). ✅ 2026-09-23
- De los 13 mapeados, 2 no son apps root de `load_menus` (`sale.sale_menu_root`, `website_sale.menu_ecommerce`) → **rail renderiza 12**. Si el cliente quiere Ventas/E-commerce en el rail, revisar alternativa (submenú `sale.sale_menu_root` con `selectMenu` directo o recorrer children). Pendiente de confirmación de producto.
- Fallback de icono de D-11 se mantiene.

---

## D-21 — Stack Docker separado para tests del sidebar

**Fecha:** 2026-09-23
**Decidido por:** usuario (Santi) vía AskUserQuestion

**Decisión:** QA del sidebar en stack **aislado**: nuevo `compose.test.yml` con `odoo_sidebar_test` (puerto **8071:8069**) + `db_sidebar_test` postgres:17 (puerto **5440:5432**) + volúmenes propios + DB `sidebar_test`. Los 4 módulos de `Custom_addons` montados igual que en `compose.yml`.

**Razón:** No perturbar el stack `odoo_debrand_test` (8070 / `debrand_test`) usado para validar la suite de debranding. Correr debranding + sidebar en paralelo, con regresión cruzada controlada.

**Consecuencias:**
- `docker compose -f compose.test.yml up -d --build`.
- Comandos de test/CDP apuntan a `localhost:8071` y contenedor `odoo_sidebar_test`.
- `compose.yml` original queda intacto.

---

## D-22 — QA = CDP (Edge headless) + matriz manual

**Fecha:** 2026-09-23
**Decidido por:** usuario (Santi) vía AskUserQuestion

**Decisión:** Alcance de QA v1 del sidebar = validación runtime con **Edge headless + CDP** (patrón exitoso sesión 7 debranding / BUG-011) + **matriz manual** (spec §7.3). Sin QUnit por ahora (queda como mejora futura, D-futura).

**Razón:** Los bugs JS del módulo (S-001…S-003) solo los cazan browser real; los tests backend no ejercitan la webclient. CDP + manual cubre los casos con menor costo.

**Consecuencias:**
- Checklist CDP en `Plan de Desarrollo.md` (Fase 5).
- Si CDP se vuelve rutina → considerar QUnit después.

---

## D-23 — Assets JS: el bundle se sirve cacheado; tras editar JS hay que reiniciar el contenedor

**Fecha:** 2026-09-23
**Aprendido en:** debugging BUG-S-002 (landing)

**Decisión:** Tras modificar cualquier archivo JS del módulo y correr `docker exec ... odoo -u erpico_web_sidebar --stop-after-init`, **reiniciar el contenedor** (`docker restart odoo_sidebar_test`) antes de validar en el navegador.

**Por qué:** el servidor en marcha sigue sirviendo el bundle `web.assets_web.min.js` (y CSS) cacheado —el `-u` regenera los attachments, pero el worker long-running re-sirve el contenido viejo. Sintoma clásico: el cambio "no aparece" en el navegador. Borrar attachments (`ir.attachment` `/web/assets/%`) NO bastó; solo el restart dio bundle fresco (verificado grepeando el bundle: `hasLandingLog` false→true).

**Flujo de trabajo establecido para iterar JS:**
1. Editar `static/src/**/*.js`.
2. `docker exec odoo_sidebar_test odoo -d sidebar_test -u erpico_web_sidebar --db_host=db_sidebar_test --db_user=odoo --db_password=odoo --stop-after-init --log-level=warn` (exit 0 = OK).
3. `docker restart odoo_sidebar_test` + esperar ~12s.
4. Correr CDP smoke (o inspección manual).

---

## D-24 — Landing Dashboards: gate por PRESENCIA del menú, no por `hasGroup`

**Fecha:** 2026-09-23
**Aprendido en:** BUG-S-002 (el `hasGroup` no resolvía true en el boot)

**Decisión (reinterpreta D-10):** `landing_patch.js` NO depende de `user.hasGroup("base.group_system")` (devuelve false/flaky en `_loadDefaultApp` — la groupCache no está hidratada). En su lugar: si el menú Dashboards **está presente** en `menuService.getApps()`, se selecciona; si no (usuario sin acceso o app desinstalada) → `super._loadDefaultApp()`.

**Consecuencias:**
- Tanto admin como no-admin **con** acceso a Dashboards aterrizan ahí (comportamiento deseable y determinista).
- No-admin **sin** acceso → comportamiento core (primera app por sequence).
- La condición `firstApp !== app.id` evita re-seleccionar si ya es la primera app.
- Si en el futuro se necesita diferenciar explícitamente admin en el landing, resolver `hasGroup` vía `session.is_system` (`odoo.__session_info__`) en vez del servicio `user` en fase de boot.

---

## D-25 — Infraestructura de QA separada del módulo

**Fecha:** 2026-09-23
**Decisión:** `compose.test.yml` y `Dockerfile` son **infraestructura de QA local**, NO forman parte del módulo `erpico_web_sidebar`. Se ubican en la raíz del proyecto (`Odoo 19 test Debranding/compose.test.yml`), fuera del repo `Branding_web_sidebar`.

**Por qué:** el módulo debe ser portable e instalable en CUALQUIER base de datos Odoo 19 con `-u erpico_web_sidebar`. `compose.test.yml` referencia rutas locales (`../erpico_debranding`, `build: ../../`) que solo existen en este entorno y no tienen sentido en un repositorio genérico del módulo.

**Consecuencias:**
- El repo `Branding_web_sidebar` contiene SOLO el módulo (JS/XML/SCSS/manifest) + `specs/` (documentación de desarrollo).
- El stack de test (`compose.test.yml` + `Dockerfile`) vive en el proyecto de desarrollo, fuera del repo del módulo.
- `mass_mailing` es dependencia del compose.test.yml (QA), NO del `__manifest__.py`.

---

## D-26 — Tokens success/danger: mantener valores propios (2026-09-23)

**Fecha:** 2026-09-23
**Decidido por:** cliente (jefe)

**Decisión:** Los tokens `--success` (`#276b48`) y `--danger` (`#b62c2c`) del `sidebar.scss` **se mantienen** aunque difieran del brand book oficial de erpico_website (`#2E7D32` / `#D32F2F`).

**Por qué:** comparativa MD5 de los assets de marca (colores principales, fuentes Outfit/Work Sans, logos, favicon y 15 iconos `brand-*.svg`) dio **1:1 exacto** contra `C:\Users\Santi\Downloads\erpico_website-Desarrollo`. Solo success/danger difieren y la diferencia es menor; el usuario decidió no alinear los tokens (los componentes actuales no los usan a nivel visible).

**Consecuencias:**
- No requiere cambio de tokens.
- Si en v2 se despliegan elementos con semántica success/danger críticos, alinear con brand book antes de visual.

---

## D-27 — BUG-S-017 (regresión debranding): fallo de entorno, no bloquea el módulo

**Fecha:** 2026-09-23
**Decidido por:** arquitecto (Hábitat Digital)

**Decisión:** La suite `erpico_debranding` falla **3 de 22** en el stack `sidebar_test`, pero los 3 fallos se reproducen idénticamente **sin** `erpico_web_sidebar` instalado (baseline BD `sidebar_baseline` = clon + módulo desinstalado). Son **preexistentes del build Odoo 19 (20260908)**:
1. `test_login_debranded` y `test_purchase_order_portal`: `QWebError Unallowed to fetch files from addon website/website_sale … Addon not installed` — check del compilador de assets frontend.
2. `test_sale_order_portal`: `NotNullViolation sale_order.picking_policy` — campo nuevo requerido que el test de la rama debranding no provee.

**Por qué / consecuencia:** `erpico_web_sidebar` solo inyecta `web.assets_backend`; no participa en frontend ni modelos `sale`. El riesgo 5 de la spec (sidebar no rompe debranding) queda **verificado**. BUG-S-017 queda documentado (Bugs.md) y la remediación corresponde a la rama `erpico_debranding`.

---

## D-28b — UI fix topbar: logo, workspace label, fondo obsidian (2026-09-24)

**Fecha:** 2026-09-24
**Decidido por:** usuario (Santi)

**Decisión:** Tras feedback visual:
1. Logo ERPICO en topbar demasiado pequeño y duplicado (sidebar/drawer ya lo tienen) → **eliminado**.
2. Texto "Mi espacio de trabajo" innecesario y estéticamente deficiente → **eliminado**.
3. Color de topbar no coincidía con brandbook → **fondo `$erpico-obsidian` (#0c112e)**, mismo que sidebar.
4. Fuente de topbar no coincidía con sidebar → **unificada a `'Outfit', 'Work Sans'`**.

**Consecuencias:**
- `navbar.xml`: eliminados `<a.o_erpico_brand>`, `<span.o_erpico_workspace_divider>`, `<span.o_erpico_workspace_label>`.
- `sidebar.scss`: `.o_main_navbar` con `background: $erpico-obsidian` + reset de colores para `.o_menu_systray`, `.o_navbar_breadcrumbs`, `.dropdown-menu`, `.dropdown-item`.
- Eliminadas reglas CSS muertas (`.o_erpico_brand`, `.o_erpico_workspace_divider`, `.o_erpico_workspace_label`, `.o_erpico_heading`).
- **Riesgo mitigado**: `.o_menu_systray` input/button/a y `.dropdown-item` forzados a `$erpico-chalk` para legibilidad sobre obsidian.
- `__manifest__.py`: bump a `19.0.1.0.3`.

**Fecha:** 2026-09-23
**Decidido por:** cliente (jefe)

**Contexto:** la topbar v1 (D-14) dejaba solo logo ERPICO + systray, eliminando brand/breadcrumbs/secciones del core. Feedback cliente: "al ingresar a un módulo faltaría el menú del módulo, es mejor y más intuitivo conservar la topbar [con contexto del módulo]".

**Decisión:** restaurar en la topbar el **contexto del módulo** como Odoo stock, conservando la marca ERPICO:
- Brand del módulo actual (`currentApp.name`, `o_menu_brand`).
- Breadcrumbs (portal `.o_navbar_breadcrumbs` del core).
- Secciones del módulo (`web.NavBar.SectionsMenu`) gateadas `!this.ui.isSmall`.
- Systray + toggle mobile intactos.
- **AppsMenu del core NO se restaura** — el rail/drawer ERPICO lo sustituye.

**Por qué:** mejor orientación dentro del módulo; el rail ya cumple la función de selector de apps. Únicamente template (`navbar.xml`) — el componente `NavBar` expone `currentApp`/`currentAppSections`/`onNavBarDropdownItemSelection` sin cambios JS.

**Consecuencias:** revierte parcialmente D-14 (topbar mínima). Ver BUG-S-023 (mejora abierta).
