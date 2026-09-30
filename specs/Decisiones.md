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
- `.o-dropdown .dropdown-toggle` del core: color morado eliminado con `!important` (transparent bg + chalk text).
- `.o_menu_sections .o_nav_entry` del core (links de sección en navbar): fondo `$o-navbar-background` = morado `$o-brand-odoo` → forzado a `$erpico-obsidian`.
- `__manifest__.py`: bump a `19.0.1.0.3`.
- `.o_erpico_module_brand` color cambiado de `$erpico-horizon-strong` (visual morbado) a `$erpico-chalk` (blanco) para consistencia con brandbook.

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

---

## D-29 — Orden del rail = 10 entradas del cliente, ícono #1 = Inicio

**Fecha:** 2026-09-26
**Decidido por:** cliente (jefe), confirmado por usuario (Santi)

**Contexto:** el cliente define el orden exacto del rail y pide además una homepage para todos los usuarios. La implementación v1 (D-19/D-20) tenía 13 apps ancladas a `menuService.getApps()`.

**Decisión:** el rail pasa de **apps** a **entradas** (`NAV_MAP` en `static/src/sidebar/nav_entries.js`). Orden pedido:

| # | Entrada | xmlids candidatos (gana el 1º presente) |
|---|---|---|
| 1 | Inicio | `erpico_web_sidebar.menu_home_root` |
| 2 | CRM | `crm.crm_menu_root` |
| 3 | Ventas | `sale.sale_menu_root` → `sale.menu_sale_order` → `sale.menu_sale_quotations` |
| 4 | Ecommerce | `website_sale.menu_ecommerce` |
| 5 | POS | `point_of_sale.menu_point_root` |
| 6 | Inventario | `stock.menu_stock_root` |
| 7 | Productos | `stock.menu_product_variant_config_stock` → `stock.menu_stock_inventory_control` |
| 8 | Compras | `purchase.menu_purchase_root` |
| 9 | Website | `website.menu_website_configuration` |
| 10 | Marketing - Email/SMS | `mass_mailing.mass_mailing_menu_root` + `mass_mailing_sms.mass_mailing_sms_menu_root` |

**Por qué entradas y no apps (verificado contra `odoo/odoo` 19.0):**
- `sale.sale_menu_root` se define con `active="False"` en `addons/sale/views/sale_menus.xml` (única definición; `_post_init_hook` de `sale` sólo sincroniza crons y anticipos) → **no llega a `getApps()`**. Por eso hay cadena de candidatos.
- `product` **no define ningún `<menuitem>`** en v19 (verificado archivo por archivo en `addons/product/views/`): Productos cuelga de Inventario (`stock.menu_stock_inventory_control`, hijos en `addons/stock/views/product_views.xml`).
- `website_sale.menu_ecommerce` es hijo de `website.menu_website_configuration` → dos entradas sobre la misma app, subárboles distintos.
- Email y SMS Marketing son **dos apps** distintas en v19 (no existe `sms_marketing` en community).

**Consecuencias:** `state.railApps`/`APP_MAP` → `state.entries`; `activeAppId` pasa a `isEntryActive(entry)` comparando `entry.appIds` con `menuService.getCurrentApp().id`; `goToSettings()` y el panel all-apps usan el índice por xmlid.

---

## D-30 — Sidebar responsivo a permisos: presencia en `menuService.getAll()`

**Fecha:** 2026-09-26

**Decisión:** no se usa `user.hasGroup()`. `/web/webclient/load_menus` ya devuelve **sólo** los menús que el usuario puede ver (`active_test` + grupos), así que la presencia de un xmlid en `menuService.getAll()` **es** el permiso. Como `getMenu(id)` sólo acepta id numérico (no hay lookup por xmlid en `webclient/menus/menu_service.js`), se indexa `getAll()` una vez en `onWillStart`.

**Consecuencias:**
- Una entrada sin ningún xmlid resoluble **no se renderiza** en rail, drawer, flyout, panel all-apps ni home.
- Drawer móvil: ahora itera las mismas entradas que el rail (antes la lista de apps del rail v1, que dejaba fuera Marketing) → **parcialmente mitiga BUG-S-022**. Sigue abierto el hecho de que el panel "Todas las aplicaciones" cuelga del `<nav>` del rail (`d-none d-lg-flex`) y por tanto no es alcanzable en móvil: las apps fuera del rail (Contactos, Facturación, Discuss, Calendario) no tienen acceso en pantallas pequeñas.
- Un cambio de permisos/grupos requiere recarga de página (o `menuService.reload()`); no hay suscripción en vivo en v1.

---

## D-31 — Contactos, Facturación, Discuss, Calendario y Ajustes salen del rail

**Fecha:** 2026-09-26

**Decisión:** el rail queda con exactamente las 10 entradas de D-29. El resto de apps del usuario se accede desde el panel "Todas las aplicaciones" (botón grid del footer del rail). **Ajustes** se mantiene en el footer del drawer móvil y en `goToSettings()` (además del acceso estándar de la topbar). Cierra el riesgo R-L2 de la spec v1.

---

## D-32 — Marketing Email/SMS = un ícono, flyout con dos grupos

**Fecha:** 2026-09-26

**Decisión:** una sola entrada con dos secciones (`Email Marketing`, `SMS Marketing`). Cada sección se renderiza sólo si su xmlid resolvió, de modo que un usuario sin `mass_mailing_sms` ve el flyout con un único grupo. El drawer móvil replica los grupos con la clase `.o_erpico_drawer_group`.

---

## D-33 — Home de ERPICO = client action propia (landing natural)

**Fecha:** 2026-09-26

**Decisión:** el home es un `ir.actions.client` con `tag="erpico_web_sidebar_home"` registrado en `registry.category("actions")` (en v19 `_executeClientAction` monta el `Component` si `clientAction.prototype instanceof Component`). El menú `menu_home_root` es **root con `sequence=1`**, sin `groups`: así `getApps()` lo devuelve como `apps[0]` y el WebClient aterriza ahí **sin patch**. `landing_patch.js` queda como red de seguridad (`home` → `spreadsheet_dashboard` → `super`).

**Alcance v1 (pedido explícito del cliente):** sólo se implementan las **2 primeras** opciones como cards (`HOME_CARDS` = Dashboards + CRM). La lista es data: crecer es añadir un objeto.

**Consecuencias:** sin modelos Python ni `ir.model.access.csv` (un client action no requiere ACL; el acceso lo controla el menú y el filtrado por presencia). Versión del módulo → `19.0.1.1.0`. Se elimina `views/webclient_templates.xml` (vacío y fuera de `data` desde la implementación del topbar por patch).

---

## D-34 — `nav_entries.js` se declara explícito en `web.assets_unit_tests`

**Fecha:** 2026-09-26

**Decisión:** el bundle de tests de Hoot (`web.assets_unit_tests`) sólo lleva `web/static/tests/**` más lo que declare cada módulo; **no** arrastra `web.assets_backend`. Por eso el módulo bajo test (`nav_entries.js`) faltaba y el loader reportaba
`modules needed by other modules but have not been defined: [@erpico_web_sidebar/static/src/sidebar/nav_entries]`.
Se declara explícitamente antes del glob de tests, junto al patrón del core.

**Alcance:** es un fix real de manifest, pero **no** habilita por sí solo los tests Hoot en este
entorno: el runner de `/web/tests` no los ejecuta con Puppeteer (`odoo.loader.modules` = 64, sin
factories de Hoot; el wrapper `hoot_module_loader.js` renombra los módulos con `" (hoot)"` y las
dependencias declaradas no se resuelven). Cobertura efectiva de la lógica JS = asserts Node
(`menuService` simulado) + suite CDP E2E contra la UI real. Se deja constancia en
`TESTS_COVERAGE.md` en lugar de declarar verde algo no verificado.

---

## D-35 — En QA, un login por contexto de browser aislado

**Fecha:** 2026-09-26

**Decisión:** los tests que cambian de usuario (matriz de permisos) abren un
`browser.createBrowserContext()` por usuario en lugar de re-loguear en la misma pestaña. El
logout de Odoo 19 es `POST /web/session/logout` (`/web/logout` devuelve 404) y, aunque se usara
la ruta correcta, reutilizar la pestaña dejó el formulario de login sin JS funcional: el click no
emite POST y la navegación cuelga.

**Consecuencias:** `cdp_matrix.js` confirma la identidad por RPC
(`/web/session/get_session_info` → `uid`) en lugar de fiarse de la URL, que puede mentir si la
sesión anterior sobrevive. Sin esto la matriz daba **falsos verdes** (10 entradas para un
usuario sin POS). Nota de entorno: los usuarios de prueba se crean con
`_set_encrypted_password` + `env.cr.commit()` porque `odoo shell` hace rollback al salir y
`password`/`new_password` no hashean nada.

---

## D-36 — Los roles van a un subaddon del repo; el sidebar depende sólo de `web`

**Fecha:** 2026-09-28 (revisa D-17 y la 1.2.0 de `readme/CHANGELOG.rst`)

**Decisión:** `erpico_web_sidebar` queda con `depends: ["web"]` y sin `security/data.xml`. Los
grupos por aplicación se declaran en `erpico_web_sidebar_roles`, un **subaddon dentro de este
repositorio** (`roles/erpico_web_sidebar_roles/`) que sí depende de `sale`, `sales_team`,
`purchase`, `stock`, `point_of_sale` y `website`.

**Por qué:** el rail filtra por permisos con `menuService.getAll()` (D-30), así que no necesita
ninguna app de negocio para funcionar: en una base sin CRM ni POS debe instalar y simplemente
mostrar menos entradas. Antes, instalar el sidebar arrastraba cinco módulos pesados, y en una base
sin ellos la instalación era imposible (BUG-S-049). Además, un módulo que pinta navegación no
debería decidir los permisos de negocio.

**Consecuencias:** el módulo de roles es **opcional**; sin él, el sidebar funciona y no hay roles
que asignar. Los XMLID cambian de módulo (ver BUG-S-050 y el `post_init_hook` del módulo de
roles, que migra los usuarios y borra los grupos antiguos). Los grupos se resuelven por
`erpico_web_sidebar_roles.group_*_erpico` en `cdp/seed_users.py`, nunca por nombre.

**Dónde vive:** dentro del repo, en `roles/erpico_web_sidebar_roles/`, para que el cliente reciba
los dos módulos en el mismo clone. Odoo escanea el `addons_path` **de un solo nivel**, así que un
módulo anidado no se encuentra solo: hay que pasarle también `<addons>/erpico_web_sidebar/roles`
en el `--addons-path` (ver `README.rst`). Es un compromiso consciente — la alternativa (dos
repos) hacía que un cambio de permisos y su módulo vivieran en sitios distintos.

---

## D-37 — Un `res.groups.privilege` por rol, no un privilegio compartido

**Fecha:** 2026-09-28 (revierte la decisión de BUG-S-036 del 2026-09-27)

**Decisión:** los cinco roles viven en una categoría propia `ERPICO` y cada uno tiene **su propio**
`res.groups.privilege`.

**Por qué:** dos razones, y la segunda es la que decide:

1. Sin `privilege_id`, un grupo no aparece en el formulario de usuario salvo con `odoo.debug`
   activo (pestaña *Extra Rights*). El cliente pidió que cualquier administrador de Ajustes
   pudiera activar los roles en modo normal.
2. El formulario de Odoo 19 dibuja **cada privilegio como un `selection`** y guarda el conjunto
   completo con `x2ManyCommands.set` sobre `group_ids`
   (`addons/web/static/src/webclient/res_user_group_ids_field/res_user_group_ids_field.js:73-80` y
   `:237-255`). Los grupos de un mismo privilegio son **excluyentes entre sí**, y el desplegable
   muestra el último privilegio asignado. Con un único privilegio "ERPICO" para los cinco roles,
   asignar Ventas desasignaría POS, Inventario, Compras y Website.

**Alternativas descartadas:** (a) reutilizar el privilegio nativo de cada módulo —el rol quedaría
como una opción más dentro de *User*/*Administrator* de ese mismo desplegable, no como un rol
propio; (b) filtrar en el JS con `env.isSuperUser`/`hasGroup` —el sidebar recibe lo que el core le
envía y duplicar el filtrado de menús del core sería una segunda fuente de verdad (mismo argumento
que descartó BUG-S-040 opción (a)).

**Consecuencias:** los roles se pueden activar en cualquier combinación. La firma visible de un
rol es un checkbox con su etiqueta, no una opción de un desplegable.

---

## D-38 — La matriz de permisos compara contra una fixture escrita a mano

**Fecha:** 2026-09-28

**Decisión:** `cdp/expected_rail.js` es una copia **deliberadamente redundante** de las entradas
esperadas (id, etiqueta visible y XMLIDs), escrita a mano y no generada desde `nav_entries.js`. El
rail expone `data-entry` y `data-xmlids` para que el test pueda leerlas del DOM.

**Por qué:** antes `cdp_matrix.js` comparaba las entradas renderizadas contra `NAV_MAP`, que es la
misma constante que usa el componente: el test sólo podía detectar que el DOM cuadraba con el
source, nunca que el server mandara de más. Un test que se compara a sí mismo es peor que no
tener test, porque da confianza falsa (BUG-S-044).

**Consecuencias:** si se toca `NAV_MAP`, hay que tocar `expected_rail.js` en el mismo commit, o
la matriz falla a propósito. Es un coste aceptado a cambio de que el fallo signifique algo.

---

## D-39 — El rail se re-resuelve con `MENUS:APP-CHANGED`; el fullscreen se deriva del evento

**Fecha:** 2026-09-28 (afecta al fix de BUG-S-034)

**Decisión:** dos cambios en `sidebar.js`:

1. `resolveEntries()` / `getApps()` se extraen a `_resolveNavigation()`, que además se llama desde
   un listener de `MENUS:APP-CHANGED` (además de `onWillStart`).
2. El estado de fullscreen se calcula con `mode === "fullscreen"` a partir de
   `ACTION_MANAGER:UI-UPDATED`, y se elimina el bucle de `requestAnimationFrame` que se había
   añadido en BUG-S-034.

**Por qué (1):** `menu_service.js` arranca desde `localStorage` y reconcilia con el servidor
después; `menuService.reload()` también dispara ese evento. El core re-renderiza la topbar ahí, y
el rail no, así que podía quedarse con los menús de la sesión anterior (BUG-S-043).

**Por qué (2):** `webclient.state.fullscreen` **sólo** se escribe en el `useBus(ACTION_MANAGER:UI-UPDATED)`
del propio core (`webclient.js:52-55`), o sea en el mismo evento que el componente ya escuchaba: el
bucle de `requestAnimationFrame` no aportaba información nueva, sólo coste. Y leer el estado del
core obligaba a confiar en el orden de los listeners del bus; derivarlo del `detail` del evento no
depende de él. Verificado con `cdp_fullscreen.js` C9 (oculta y restaura).

**Consecuencias:** `_resolveNavigation()` es idempotente y se puede llamar en cualquier momento; si
el flyout estaba abierto sobre una entrada que ya no resuelve, se cierra. Menos código y menos
superficie que un bucle de animación permanente.

---

## D-40 — Los reportes se destapan por `group_ids` del menú, no por `implied_ids` del manager

**Fecha:** 2026-09-30

**Decisión:** en `roles/erpico_web_sidebar_roles/security/report_menus.xml`, el nodo *Reporting* de
cada app se abre **sumando el grupo _usuario_ nativo al `group_ids` del menú nativo**, con
`<record id="<módulo>.<xmlid>" model="ir.ui.menu"><field name="group_ids" eval="[(4, ref(...))]"/>`.
Los grupos se suman al `implied_ids` de los roles ERPICO **no**.

**Por qué (1):** `ir.ui.menu.group_ids` es un m2m **aditivo** con semántica OR — el filtro de
`ir_ui_menu._visible_menu_ids` es `not m.group_ids or m.group_id in groups` — así que `(4, ref(...))`
abre exactamente ese menú y nada más.

**Por qué (2):** la alternativa de poner el grupo *manager* en `implied_ids` también funciona, pero
arrastra todo lo que ese grupo abre: *Configuration* de cada app, acciones de ajuste, precios,
impuestos, Diário. El cliente pidió ver reportes, no administrar las apps. Abrir un report no
requiere ser manager: el ACL de `sale.report`, `purchase.report`, `stock.move`, `stock.quant`,
`report.pos.order` y `crm.activity.report` ya da lectura al grupo usuario (verificado en
`ir.model.access.csv` de 19.0).

**Por qué (3):** es el mismo mecanismo que descartó BUG-S-035, pero al revés. Allí se creyó que
`(4, ref(...))` restringía, cuando amplía — y la ampliación no era el objetivo. Acá la ampliación es
justo lo pedido, y acotada a un solo menú por app.

**Por qué se gatea con el grupo nativo y no con el ERPICO:** así lo ve cualquier usuario de la app,
incluidos los que un administrador asignó a mano en Ajustes sin pasar por un rol. El cliente lo
eligió explícitamente sobre la alternativa de gatear con `group_*_erpico`.

**Consecuencias y trampas:**

- Odoo tiene **un solo árbol de menús**: destapar `sale.menu_sale_report` lo muestra también en el
  menú nativo de Odoo, no sólo en el sidebar ERPICO. Inevitable con este enfoque.
- `sale.report` conserva `sale_order_report_personal_rule`, así que un usuario sin
  `sales_team.group_sale_salesman_all_leads` ve **sólo sus propios pedidos** en el reporte. Se
  aceptó a propósito: implicar ese grupo ampliaría también el resto de vistas de venta.
- Los dos wizards de POS (`menu_report_order_details` y `menu_report_daily_details`) usan
  `(6, 0, [...])`, no `(4, ...)`: el estado deseado es "sólo manager". Son los únicos ítems de
  Reporting cuyo modelo no tiene ACL de lectura para `group_pos_user` (BUG-S-052).
- `stock.menu_valuation` ("Locations") **no** se toca: su definición nativa lleva
  `group_stock_multi_locations, group_tracking_owner, base.group_no_one` porque su visibilidad
  depende de si multi-ubicación está habilitado. Lo decide el core.
- **Abrir el nodo padre no basta: hay que abrir también su hoja.** `ir_ui_menu._visible_menu_ids`
  aplica, después del filtro por grupos, un *"remove all menus without children"*: un nodo de
  agrupación al que no le queda **ningún** hijo visible desaparece entero del payload, y con él la
  rama. En Compras esto era el caso normal, no la excepción: `purchase.purchase_report_main` tiene
  **una sola** hoja, `purchase.purchase_report`, y el core la define con
  `groups="purchase.group_purchase_manager"`. Con el padre solo, `group_purchase_user` se quedaba
  con cero hijos visibles y el nodo se podaba: D-40 era inerte en Compras (BUG-S-054, detectado por
  `check_report_menus.js` en la QA en vivo). Ventas e Inventario no lo tienen, porque sus 4 hojas
  son casi todas sin gate.
- El archivo va **sin `noupdate`**: `(4, ...)` y `(6, 0, ...)` son idempotentes, y así un upgrade
  re-repara el estado si alguien lo editó a mano desde el editor de menús.
- `website_sale` entra en `depends` del módulo de roles: `menu_report_sales` sólo existe si
  `website_sale` está instalado, y cuelga de `website.menu_reporting`, que ya es visible para
  `base.group_user`. Arrastra `website_payment`, `website_mail`, `delivery`, `digest`,
  `portal_rating` y `html_builder`.

**Dónde vive:** `roles/erpico_web_sidebar_roles/security/report_menus.xml`. **Cero cambios en JS**:
el flyout ya es recursivo (`sidebar.xml:207`) y el server manda los menús destapados en
`menuService.getAll()`, que es lo que consume `resolveEntries` (D-30).

## D-41 — Cada submenú de Producto es una sección-hoja, y las plantillas caen a `section.leaf`

**Fecha:** 2026-09-30

**Decisión:** la entrada `productos` de `NAV_MAP` se parte en 4 secciones de una sola hoja
accionable (`Productos`, `Variantes`, `Listas de precios`, `Atributos`) en vez de apuntar a un
único contenedor. Flyout y drawer renderizan `section.leaf` cuando la sección no trae
`childrenTree`. Los permisos van por `product_menus.xml`, con el mecanismo de D-40.

**Por qué (1):** en Odoo 19 la entrada salía **vacía**. Apuntaba a
`stock.menu_product_variant_config_stock`, que es una hoja accionable sin hijos, y las dos
plantillas iteraban sólo `section.childrenTree` —que en una hoja es `[]`. El bug era del render,
no de permisos: el menú era alcanzable y no se dibujaba.

**Por qué (2):** el módulo `product` **no define ningún `<menuitem>`** en 19.0, y por lo tanto no
expone **ningún** xmlid de `ir.ui.menu` (verificado: `SELECT` sobre `ir_model_data` filtrando
`module='product'` devuelve 0 filas). No existe `product.menu_product_root`. Los destinos cuelgan de
`stock` / `sale` / `purchase` / `point_of_sale` / `website_sale`, y varios de esos `<menuitem>`
siguen sin `id`. Por eso `pickMenu` no alcanzaba: el primer xmlid candidato presente era una hoja.

**Destinos elegidos** (los únicos con cadena de ancestros que no pasa por *Configuration*):

| Submenú | xmlid | Gate nativo |
|---|---|---|
| Productos | `stock.menu_product_variant_config_stock` | ninguno |
| Variantes | `stock.product_product_menu` | `product.group_product_variant` |
| Listas de precios | `sale.menu_product_pricelist_main` | `product.group_product_pricelist` |
| Atributos | `website_sale.menu_product_attribute_action` | `product.group_product_variant` |

**Por qué (3) — Categorías queda fuera, por decisión del cliente:** en el core **toda** ruta de
`product.category` pasa por un nodo *Configuration* gateado a manager
(`stock.menu_product_in_config_stock` ← `stock.menu_stock_config_settings`; lo mismo en `sale` y
`purchase`; y `account` exige el grupo de Facturación). Abrir cualquiera de esos ancestros no
exponía Categorías: exponía **toda la sección Configuración**. Se ofreció al cliente y eligió
omitir Categorías antes que escalar privilegios. Queda accesible bajo Inventario › Configuración
para quien sea manager, como en el core. `check_product_menus.js` la fija en `notSee`.

**Por qué (4) — Atributos va por `website_sale` y no por `stock`:** `stock.menu_attribute_action`
tiene el mismo modelo y la misma acción, pero cuelga de *Configuration*. La única rama de Atributos
que no escala es la de `website_sale.menu_catalog`, así que se usa esa. Side effect aceptado: el
menú aparece también bajo Website › Comercio electrónico (el árbol de menús de Odoo es único, igual
que en D-40).

**Consecuencias y trampas:**

- **La entrada se ve recortada según permisos, y es a propósito.** Listas de precios y Atributos
  cuelgan de `sale.product_menu_catalog` y `website_sale.menu_catalog`, ambos gateados a
  `sales_team.group_sale_salesman`. Un usuario con **sólo** el rol Inventario ERPICO no los alcanza.
  Forzar los 4 exigiría abrir esos ancestros, y eso **arrastraría las apps Ventas y Website al rail**
  de un usuario que no las tiene. El sidebar ya es responsivo a permisos por diseño (comentario de
  `resolveEntries`), así que se respeta: el usuario de inventario ve 2 items. Ver `inv` en
  `check_product_menus.js`, que además asserta `sale.sale_menu_root` ausente.
- **No hay Access Denied detrás de estos ítems**, al contrario que en BUG-S-052: se auditaron las
  ACL de lectura de los cinco modelos y `product.category`, `product.template`, `product.pricelist`,
  `product.attribute` y `product.product` dan lectura a `base.group_user`. Las 5 acciones tampoco
  tienen `group_ids` propio, así que abrir el menú alcanza.
- **El texto visible no es el `label` de la sección** sino el `name` del menú del core, en el idioma
  del usuario (`inv` ve "Product Variants" en inglés, `basic` ve "Variantes del producto" en
  español). El `label` de la sección existe sólo para que las 4 claves del `t-foreach` no colisionen:
  sin `label` explícito, `resolveEntries` les pondría a todas `def.label`.
- **`basic` no puede probar este XML.** Trae `product.group_product_variant` y
  `product.group_product_pricelist` por otras vías, así que los 4 menús se verían igual sin
  `product_menus.xml`. Se agregó el usuario QA `inv` (sólo rol Inventario ERPICO) justamente para
  eso: es el único con `stock.group_stock_user` y **sin** `product.group_product_variant`, o sea
  sin el gate nativo de *Variantes*.
- `seed_users.py` dejaba `basic` en `[]`, es decir como usuario interno pelado. Eso contradecía el
  baseline con el que se calibró la suite (122 menús, rail de 9 items, expectativas de
  `check_report_menus.js`). Se restauró a grupos usuario de las 4 apps, sin managers.

**Dónde vive:** `static/src/sidebar/nav_entries.js` (secciones), `static/src/sidebar/sidebar.xml`
(flyout y drawer), `roles/erpico_web_sidebar_roles/security/product_menus.xml` (permisos).
