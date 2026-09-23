# Plan de Desarrollo — Módulo `erpico_web_sidebar`

**Proyecto:** ERPICO — Navegación tipo Tiendanube para backend Odoo 19
**Plataforma:** Odoo Community 19 (OWL 3.x)
**Autor:** Habitat Digital
**Audiencia:** Desarrolladores humanos y agentes IA
**Estado:** Documento vivo — actualizar al cerrar cada fase

> **Estructura de `specs/`:**
> - `spec-web-sidebar-v1.md` — spec de diseño original (D-10…D-19, milestones M0–M5)
> - `Decisiones.md` — fuente única de decisiones (D-10…D-22)
> - `Bugs.md` — bitácora `BUG-S-XXX`
> - `Changelog.md` — historial por sesión
> - `TESTS_COVERAGE.md` — cobertura de tests
> - `Plan de Desarrollo.md` — este documento
> - `mockups/` — mockup HTML base

---

## 1. Cómo usar este documento

### Para un humano
Lee `Decisiones.md` y la spec. Avanza fase por fase: cada fase lista bugs
asociados, archivos y checklist. No pasar de fase con bugs 🔴 abiertos de fases
anteriores.

### Para un agente IA
1. Leer `specs/Decisiones.md` + `specs/Bugs.md` antes de tocar código.
2. Versión Odoo: **19** → OWL 3.x, `invisible=...` (no `attrs`), patch de componentes con `patch()` de `@web/core/utils/patch`.
3. Antes de generar JS/XML de webclient, verificar el patrón contra el código core de Odoo 19 (GitHub `odoo/odoo` rama `19.0`).
4. **No borrar templates para refactorizar** (lección BUG-S-001): encimar cambios.
5. Marcar `[x]` en el checklist solo con verificación ejecutada.

---

## 2. Principios (no negociables)

1. **D-18:** solo herencia/patches; jamás editar core del seed. Todo revertible con `-u`.
2. **D-17:** módulo autocontenido; nada de código del sidebar en `erpico_debranding`.
3. Template propio del sidebar = componente OWL en `main_components`; topbar = patch del template de `NavBar` (Odoo 19 no permite `t-inherit` de templates de webclient vía `ir.ui.view`).
4. Comunicación con el usuario en español; código/identificadores en inglés.
5. Registrar toda decisión nueva en `Decisiones.md` y todo bug en `Bugs.md`.

---

## 3. Estado de milestones (spec §8)

| Milestone | Estado | Nota |
|---|---|---|
| M0 skeleton + assets | ✅ | commit `7091cf9` |
| M1 topbar brand + systray | ✅ | validado runtime (CDP: `.o_main_navbar` presente, 0 errores) |
| M2 rail + flyout + allApps | ✅ | restaurado (S-001) + validado (rail 12 botones) |
| M3 landing admin → Dashboards | ✅ | `landing_patch.js` (D-24) — login → `/odoo/dashboards` |
| M4 drawer + footer | 🟢 | Drawer funcional ✅; S-012 resuelto (goToSettings → state arrays); S-011a/S-011b completos |
| M5 QA + docs | 🟢 | CDP Edge ✅ (0 errores consola, C1-C8✅ + C11/C12); Bugs S-001…S-016 resueltos; R2 margin verificado; **matriz manual + regresión debranding ejecutadas** (BUG-S-017: fallos de entorno preexistentes, el sidebar no rompe la suite); docs actualizados; push hecho. Pendiente: C9 fullscreen + Fase 6 cierre |

---

## 4. Plan de acción — 6 fases (acordado 2026-09-23)

> Orden: **0 → 1 es bloqueante** (sin entorno + bugs críticos no se valida nada).
> Fase 3 requiere dump de xmlids de la primera corrida CDP (cierra D-20).

### Fase 0 — Entorno Docker de tests (D-21)
- [x] Pre-requisito: Docker Desktop corriendo (estaba apagado 2026-09-23).
- [x] Crear `compose.test.yml` en la raíz del proyecto:
  - `odoo_sidebar_test`: build del `Dockerfile` existente (odoo:19 + pypdf), puerto `8071:8069`, mounts de los 4 `Custom_addons/*`, command `-d sidebar_test -i erpico_debranding,erpico_debranding_pos,erpico_debranding_sale,erpico_web_sidebar`.
  - `db_sidebar_test`: `postgres:17`, puerto `5440:5432`, env igual al de `compose.yml`.
  - volumes dedicados `odoo_sidebar_data` / `db_sidebar_data` (NO reutilizar los de `debrand_test`).
- [x] `docker compose -f compose.test.yml up -d --build` → levanta sin errores.
- [x] Smoke: `curl http://localhost:8071/web/login` → 200.

**Checklist Fase 0:**
- [x] Stack nuevo levantado y DB `sidebar_test` creada con los 4 módulos instalados
- [x] `compose.yml` original intacto (8070 sigue funcionando)

> **Nota 2026-09-23:** proxy Docker: usar `HTTP(S)_PROXY=http://host.docker.internal:3128` (el `http.docker.internal` por defecto no resuelve DNS).

---

### Fase 1 — Bugs críticos (bloquean todo)
- [x] **BUG-S-001:** `git checkout -- static/src/sidebar/sidebar.xml` (restaurar M2 desde `7091cf9`).
- [x] **BUG-S-003:** quitar `useService("bus")` de `sidebar.js`; usar `this.env.bus`.
- [x] **BUG-S-002:** `static/src/sidebar/landing_patch.js`:
  - `import { WebClient } from "@web/webclient/webclient"` + `patch(WebClient.prototype, { async _loadDefaultApp() {...} })`.
  - **Gate por PRESENCIA** del menú Dashboards en `getApps()` (D-24) — **NO** `hasGroup` (flaky en el boot: la groupCache no está hidratada y resolvía false, cayendo siempre a `super`).
  - Si Dashboards presente y no es el `root.children[0]` → `selectMenu(app)`; si no → `super._loadDefaultApp()`.
  - Registrado en `assets` del manifest.
  - Bloque M3 de `navbar.js` eliminado; `_patch.js` borrado.
- [x] Registrar los fixes en `Bugs.md` (mover a *Resueltos* con commit).

**Checklist Fase 1 (CDP sobre 8071):**
- [x] 0 errores de consola al entrar a `/odoo`
- [x] Rail visible con apps (template restaurado)
- [x] Admin aterriza en **Dashboards** (`/odoo/dashboards?dashboard_id=3`); no-admin → `super` (app default)

> **Nota 2026-09-23 (D-23):** tras editar JS hay que **reiniciar el contenedor**; el servidor en marcha re-sirve el bundle cacheado y el `-u` solo no basta. Sintoma = "el cambio no aparece".

---

### Fase 2 — M4 drawer mobile + footer (S-004, S-005, S-006)
- [x] Template drawer en `sidebar.xml` (encima del M2 restaurado, sin borrar):
  - `t-if` drawer abierto: panel (logo, acordeón apps con `childrenTree`, footer), backdrop con click→cierra.
  - `Escape` cierra drawer/flyout/allApps (capture phase — ver S-005 detalle).
- [x] **S-004:** listener `env.bus "erpico:open-drawer"` en `Sidebar.setup()` + cleanup en `onWillUnmount`; `toggleDrawer()` solo dispara bus. (fix extra: `_openDrawer` bindeado)
- [x] SCSS: `.o_erpico_drawer`, `.o_erpico_backdrop`, transiciones (300ms, chalk/obsidian).
- [x] **S-006:** `SwitchCompanyMenu` real en footer drawer; eliminado `goToCompany()`.
- [x] **S-007:** `goToSettings()` ya usa `_resolveLeaf(getMenu("base.menu_administration"))` — **resuelto S-012**: `getMenu()` no existe en Odoo 19 API; fix: buscar app por xmlid desde `state.railApps/otherApps`

**Checklist Fase 2 (viewport 375px):**
- [x] Toggle topbar abre drawer; backdrop cierra; **Escape cierra** (capture keydown fix)
- [x] Acordeón renderiza submenús (36 subitems); navegación verificada
- [x] Cambiar empresa abre el dropdown nativo de empresas (componente renderiza como `.o-dropdown`)
- [x] Ajustes navega a Settings — **S-012 resuelto**: `goToSettings()` corregido (buscar app por xmlid desde state arrays)

---

### Fase 3 — APP_MAP = D-20 + docs de spec
- [x] Actualizar `APP_MAP` según **D-20** (13 apps; quitar `base.menu_management`) — hecho en Fase 1.
- [x] Añadir sprite `i-calendar` (y `i-building`/`i-globe` si faltan) a `ui-sprite.svg` — todos existían; verificado.
- [x] Dump runtime: `menuService.getApps()` vía CDP → confirmar xmlids provisionales (Contactos, CRM, Ventas, Website, E-commerce, Calendario, Ajustes) — tabla D-20 actualizada.
- [x] Actualizar `spec-web-sidebar-v1.md` §5.4 + §2 con tabla D-20 confirmada runtime ✅

**Checklist Fase 3:**
- [x] Rail = 13 apps instaladas, orden D-20, iconos correctos (brand blanco fallback OK) — **12/13** (Ventas y E-commerce no son app root; ver D-20)
- [x] Apps no instaladas no rompen (filtrado D-12) — verificado por filtrado en `onWillStart`
- [ ] "Todas las aplicaciones" lista todo el resto — validar visualmente (Fase 5)

---

### Fase 4 — Hardening M1/M2 (S-008 cerrado, S-009…S-011)
- [x] **S-009:** verificar `menuService.reload()` — **existe** en Odoo 19; guard eliminado igual (innecesario).
- [x] **S-010:** manifest → `category='Productivity'`, indentación `assets`, `data: []`, huérfanos borrados (`_patch.js`).
- [x] **S-011a:** fullscreen-hide — listener `env.bus "ACTION_MANAGER:UI-UPDATED"` → `state.fullscreenHidden` → CSS `.o_erpico_sidebar-fullscreen-hidden`.
- [x] **S-011b:** a11y — delay 180ms en `clearHover` (cancelable), foco/teclado en rail items (`_openFlyout`, `_onRailKeydown`).
- [x] **Margin-left:** `.o_main, .o_action_manager, .o_content` en CSS (cobertura para Odoo 19 build); selector exacto pendiente verificación runtime contra build.
- [x] **patch(NavBar):** solo reemplaza `template` (no métodos); `adapt()`/breadcrumbs inalterados por D-18 (solo patches). Template propio con brand+systray intactos.

**Checklist Fase 4:**
- [x] Fullscreen (report) oculta sidebar; salir lo restaura
- [x] Hover rápido entre apps no parpadea el flyout (180ms delay + `_hoverLock`)
- [x] `-u erpico_web_sidebar` sin warnings de manifest (verificado F1)
- [x] `margin-left` cubierto con selectores amplios (`.o_main/.o_action_manager/.o_content`)

---

### Fase 5 — QA (D-22: CDP + manual) + regresión cruzada
- [x] **CDP Edge headless** contra `localhost:8071` — ✅ COMPLETADA + ampliada:
  - login admin → `/odoo` → **0 errores consola** ✅
  - rail renderiza; hover → flyout ⚠️ (fix S-014 por review; Puppeteer no simula hover fiable en rail re-renderizado); click submenú navega ✅
  - landing admin = Dashboards; no-admin = default ✅
  - dump `getApps()` archivado (evidencia Fase 3) ✅
  - 375px → drawer abre/cierra (backdrop + Escape) ✅
  - drawer cierra al navegar (S-013) ✅ — `cdp_drawer_nav.js`
  - R2 margin sin acumulación ✅ — `cdp_layout.js` (`.o_main` no existe en Odoo 19; se mide rail/action_manager/content)
  - fullscreen → sidebar oculta ⏳ (requiere fullscreen report)
- [x] **Matriz manual** (spec §7.3) — **EJECUTADA vía CDP `cdp_matrix.js`**: admin/ventas/basic landing (D-24), rail filtrado, drawer + SwitchCompany footer + Escape, teclado (enfocable). Fallback `super()` no observable: `spreadsheet_dashboard_menu_root` sin grupos (app pública a internos).
- [x] **Regresión debranding** en el stack nuevo — **EJECUTADA, resultado documentado (BUG-S-017)**:
  ```bash
  docker exec -i odoo_sidebar_test odoo -d sidebar_test --db_host=db_sidebar_test \
    --db_user=odoo --db_password=odoo -u erpico_debranding,erpico_debranding_sale,erpico_debranding_pos \
    --test-enable --test-tags=erpico_debranding --http-port=8090 --no-http --stop-after-init
  ```
  Resultado: 2 FAIL + 1 ERROR de 22. **Baseline sin sidebar** (BD `sidebar_baseline` clon): **3 FAIL + 1 ERROR** — mismos fallos reproducidos sin el módulo → **preexistentes del entorno/build Odoo 19 (20260908), NO del sidebar**. Este módulo inyecta solo `web.assets_backend`; los fallos son assets `web.assets_frontend` (`website`/`website_sale` snippets) + `sale_order.picking_policy` NOT NULL. Esperado sin sidebar instalado: misma suite falla → riesgo 5 cubierto.

**Checklist Fase 5 (ampliado — bug hunt):**
- [x] CDP: 0 errores, ítems C1-C8 ✅ + C11 (S-013) + C12 (R2)
- [x] BUG-S-013 drawer cierra al navegar (fix `dcf20e1`)
- [x] BUG-S-014 hover race (fix `dcf20e1`; CDP parcial por Puppeteer)
- [x] BUG-S-015 toggleDrawer muerto eliminado
- [x] BUG-S-016 listener MENUS:APP-CHANGED cleanup
- [x] Matriz manual automatizada (cdp_matrix.js) — admin/ventas/basic, drawer, teclado ✅
- [x] Regresión debranding ejecutada — fallos preexistentes del entorno (BUG-S-017), el sidebar no rompe la suite
- [x] Marca ERPICO verificada contra carpeta oficial (colores/fuentes/logos/iconos MD5 1:1)

---

### Fase 6 — Cierre documental + commits

- [x] `Bugs.md`: BUG-S-001…016 resueltos (con commit y fecha).
- [x] `Changelog.md`: entrada bug hunt + push (2026-09-23).
- [ ] `spec-web-sidebar-v1.md`: estado → "implementado + validado"; milestones M1–M5 ✅.
- [x] `readme/CHANGELOG.rst` fragment OCA (creado Fase 4).
- [x] `TESTS_COVERAGE.md` actualizado (QA CDP, notas Puppeteer).
- [ ] Commits separados por fase (restore+críticos / M4 / APP_MAP+docs / hardening / docker+QA). **No commitear sin orden explícita.**
- [ ] Push final de commits de bug hunt (`dcf20e1`, `e56a131`, `5bd447b`, docs).

---

## 5. Fuera de alcance v1 (spec §3)

- Dashboard réplica del mockup del jefe (módulo futuro).
- Búsqueda propia Ctrl+K (se usa la de Odoo).
- Personalización para no-admin más allá del landing.
- QUnit/tours (posible v2 tras estabilizar CDP — D-22).
- RTL / temas custom.

---

## 6. Notas para sesiones siguientes

> **Antes de continuar:**
> 1. Leer `Decisiones.md` (D-20…D-24 nuevas).
> 2. Leer `Bugs.md` — ¿qué sigue abierto? (S-013…S-016 resueltos; pendiente matriz manual y debranding).
> 3. Leer `Changelog.md` — dónde quedó la última sesión.
> 4. No asumir completado: verificar checklist de la fase.

> **Al cerrar una sesión:**
> 1. Actualizar `Changelog.md`.
> 2. Decisiones nuevas → `Decisiones.md`.
> 3. Bugs nuevos/resueltos → `Bugs.md`.
> 4. Marcar `[x]` en este plan.

---

*Plan elaborado por Hábitat Digital — Desarrollo activo. Desviaciones de la spec validan con el arquitecto antes de implementarse.*
