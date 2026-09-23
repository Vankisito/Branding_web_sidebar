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
| BUG-S-011 | 2026-09-23 | Spec §5.8 / §5.3 pendientes | Falta: fullscreen-hide, delay 180ms, a11y teclado, `readme/CHANGELOG.rst`, `margin-left` selector. | UI/UX | ⚪ Baja | Resuelto |

### Detalle de bugs abiertos

**BUG-S-011 — Spec §5.8 / §5.3 pendientes**
- *Resolución completa (2026-09-23):*
  - **`readme/CHANGELOG.rst`**: fragment OCA creado con todos los fixes/features
  - **`margin-left`**: selectores amplios `.o_main, .o_action_manager, .o_content` en sidebar.scss
  - **QUnit/tour**: documentados como candidato v2 (fuera de alcance v1, D-22)
- *Verificado:* fullscreen-hide (S-011a), a11y delay/keyboard (S-011b) ✅ |

**BUG-S-012 — "Ajustes" no navega en móvil (drawer footer)**
- *Contexto:* `goToSettings()` usaba `this.menuService.getMenu("base.menu_administration")` que **no existe** en el API del menu service Odoo 19 (métodos válidos: `getApps()`, `getMenuAsTree(id)`). Retorna `undefined` → `_resolveLeaf(undefined)` → `selectMenu` nunca se llama.
- *Fix:* Buscar el app por `xmlid` desde `[...state.railApps, ...state.otherApps].find(a => a.xmlid === "base.menu_administration")`. Estos arrays ya están poblados en `onWillStart` con `_childrenTree`. `_resolveLeaf(settingsApp)` encuentra la primera hoja con `actionID`.
- *Resuelto:* 2026-09-23 — `goToSettings()` corrigido en `sidebar.js`.

**BUG-S-001 — Template del sidebar vaciado**
- *Origen:* diff working tree sin commitear (`git diff` 2026-09-23): `-144 líneas` en `sidebar.xml`.
- *Solución propuesta:* `git checkout -- static/src/sidebar/sidebar.xml` (restaurar versión del commit `7091cf9`) y **nunca borrar el template para refactorizar**: encimar el markup del drawer M4 encima.
- *Verificación:* CDP — rail visible con apps del `APP_MAP`.

**BUG-S-002 — Landing admin (M3) no funcional**
- *Causa raíz original:* patrón de "inyección diferida por setTimeout + global" inviable en módulos ES de Odoo.
- *Solución final (2026-09-23):* `static/src/sidebar/landing_patch.js` (patch a nivel de módulo de `WebClient.prototype._loadDefaultApp`).
- *Hallazgo clave v1→v2:* el `hasGroup("base.group_system")` **falla/nunca resuelve true en el boot** (devuelve false o error → se cae al fallback). Se reemplazó por gate por **PRESENCIA** del menú Dashboards en `menuService.getApps()`:
  ```js
  const app = getApps().find(a => a.xmlid === "spreadsheet_dashboard.spreadsheet_dashboard_menu_root");
  const firstApp = getMenu("root").children[0];
  if (app && firstApp !== app.id) return menuService.selectMenu(app);
  return super._loadDefaultApp(...arguments);
  ```
  Determinista; admin y no-admin con acceso a Dashboards aterrizan ahí (D-10/D-24). Usuario sin Dashboards → `super()`.
- *Verificación:* CDP — tras login admin el URL es `/odoo/dashboards?dashboard_id=3`; 0 errores de consola. (Instrumentación temporal `[LANDING]` confirmó: `apps=12 hasApps=true firstId=83 (mail.menu_root_discuss)` → `selectMenu(183)` OK.)
- *Lección infraestructura:* el bundle `web.assets_web.min.js` se sirve **cacheado** — tras editar JS + `-u` hay que **reiniciar el contenedor** (D-23). Sin restart, el patch no llega al navegador y el debug parece "código roto".

**BUG-S-003 — Servicio `bus` inexistente**
- *Solución (2026-09-23):* quitado `useService("bus")`; se usa `this.env.bus` (`.trigger` / `addEventListener`). `Sidebar.setup()` ya no crashea.

**BUG-S-004 — Toggle mobile sin listener**
- *Solución propuesta:* en `Sidebar.setup()`: `this.env.bus.addEventListener("erpico:open-drawer", handler)` + `removeEventListener` en `onWillUnmount`. `toggleDrawer()` solo dispara el bus; el estado lo maneja Sidebar.

**BUG-S-006 — Cambiar empresa**
- *Solución propuesta:* importar y renderizar `SwitchCompanyMenu` (`@web/webclient/switch_company_menu/switch_company_menu`) en el footer del rail/drawer; eliminar `goToCompany()` y el evento fantasma.

**BUG-S-008 — APP_MAP vs spec D-19**
- *Resolución acordada (2026-09-23):* ver **D-20** en `Decisiones.md` — rail = D-19 + Discuss + Calendario + Ajustes; se quita `base.menu_management`. xmlids de Calendario y Website/E-commerce **provisionales**, confirmar con dump de `menuService.getApps()` vía CDP.

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
| BUG-S-012 | 2026-09-23 | `goToSettings()` no navega en móvil | `menuService.getMenu()` no existe en Odoo 19 API. Fix: buscar app por xmlid desde `state.railApps/otherApps` (con `_childrenTree` pre-poblado en `onWillStart`) | CDP: Ajustes navega a Settings (móvil) |

---

*Estado: `Abierto` · `En progreso` · `Resuelto` · `Pendiente-config`.*
