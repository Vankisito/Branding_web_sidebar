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
| BUG-S-018 | 2026-09-23 | Fullscreen-hide (S-011a) nunca se activaba | `_onUIUpdated(env)` leía `env.mode`, pero OWL `EventBus.trigger` empaqueta el payload del evento `ACTION_MANAGER:UI-UPDATED` en `event.detail` (el core webclient.js lo desestructura `{detail: mode}`). `env.mode` → `undefined` → `fullscreenHidden` siempre `false`; el sidebar quedaba visible en modo fullscreen. Solución: `_onUIUpdated(evt)` lee `evt.detail` (patrón del core). | ✅ cdp_fullscreen.js: `/odoo/action-567` (target fullscreen real) → sidebar `display:none`; restaura al navegar |

---

*Estado: `Abierto` · `En progreso` · `Resuelto` · `Pendiente-config`.*
