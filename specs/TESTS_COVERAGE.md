# Cobertura de Pruebas — Módulo `erpico_web_sidebar`

> Estado de la QA al cierre de las **Fases 0–1** (2026-09-23): stack Docker
> `sidebar_test` funcionando y bugs críticos S-001/S-002/S-003 resueltos con
> evidencia CDP.
>
> **Última actualización:** 2026-09-23 — Fase 5+6 completa. Tests CDP C1–C12 verdes (incl. **C3 hover** y **C9 fullscreen** ahora por coordenadas reales `page.mouse`). Bugs S-001…S-018 resueltos (S-018 descubierto en C9: `_onUIUpdated` leía `env.mode`, OWL entrega payload en `event.detail`; corregido y re-verificado). BUG-S-017: regresión debranding falla 3/22 por entorno/build (NO es del módulo; Fase 6 cerrada, push `9c359ce`).

---

## 1. Resumen

- **Tests automatizados (Python/QUnit):** 0 (sin modelos; frontend puro).
- **QA runtime ejecutada:** sí — CDP Edge headless sobre `http://localhost:8071` (login admin).
- **Estrategia v1 (D-22):** CDP Edge headless + matriz manual. QUnit queda fuera (mejora futura).
- **CDP ejecutado (Fase 1):** login admin → **0 errores de consola** → URL final `/odoo/dashboards?dashboard_id=3`, rail 12 botones, navbar `.o_main_navbar` presente.

### Comandos previstos (una vez exista el stack — Fase 0)

```bash
# Stack de test del sidebar (D-21)
docker compose -f compose.test.yml up -d --build

# Regresión debranding dentro del stack nuevo (Fase 5)
docker exec -i odoo_sidebar_test odoo -d sidebar_test \
  -u erpico_debranding,erpico_debranding_sale,erpico_debranding_pos \
  --test-enable --test-tags=erpico_debranding \
  --http-port=8090 --no-http --stop-after-init
```

---

## 2. QA runtime planificada (CDP — Fase 5)

Edge headless + CDP contra `http://localhost:8071` (patrón validado en
`erpico_debranding` sesión 7 / BUG-011):

| # | Check | Cubre | Estado |
|---|---|---|---|
| C1 | Login admin → `/odoo` → **0 errores de consola** | S-001, S-002, S-003, crash de assets | ✅ CDP: 0 errores, `/odoo/dashboards?dashboard_id=3` |
| C2 | Rail visible con apps del `APP_MAP` (D-20) | S-001, S-008 | ✅ 12 botones, navbar presente |
| C3 | Hover rail → flyout abre con submenús reales | M2 / D-13 | ✅ CDP: cdp_hover.js — hover por coordenadas (`getBoundingClientRect` + `page.mouse.move`); S-014 sin race |
| C4 | Clic submenú → navega (cambio de vista) | D-13 | ✅ CDP: cdp_drawer_nav.js — clic app drawer navega y cierra drawer (S-013) |
| C5 | Landing admin = Dashboards; no-admin = default | S-002 / D-10 | ✅ CDP: `/odoo/dashboards?dashboard_id=3` |
| C6 | Dump `menuService.getApps()` → xmlids confirmados | D-20 (provisionales) | ✅ todos confirmados (ver D-20) |
| C7 | Viewport 375px → toggle → drawer abre; backdrop/Escape cierran | S-004, S-005 | ✅ CDP: toggle ✓, drawer ✓, backdrop ✓, Escape ✓ |
| C8 | Footer: Ajustes navega; SwitchCompanyMenu abre dropdown | S-006, S-007 / D-15 | ✅ URL → `/odoo/settings`, dropdown presente |
| C9 | Fullscreen report → sidebar oculta; salir → restaura | S-011 | ✅ CDP: cdp_fullscreen.js — `/odoo/action-567` (action window `target=fullscreen` real, rg "Pick a Theme") → sidebar `display:none` (class fullscreen-hidden); navegar a `/odoo` restaura. Descubrió y corrigió S-018 |
| C10 | Systray intacto (buscador, campana, usuario) | D-14 / S-011 (NavBar patch) | ✅ navbar renderiza; resto visual → manual |
| C11 | Drawer cierra al navegar (app/submenu) | S-013 | ✅ CDP: cdp_drawer_nav.js |
| C12 | Margin-left contenido no se acumula con rail | R2 | ✅ CDP: cdp_layout.js — sin acumulación. ⚠️ **BUG-S-020:** el test no llama `setViewport` → hereda 800×600 → sidebar `display:none` (breakpoint d-lg-flex ≥992); informe falso "sidebar oculto a 1024px". Con viewport real 1024: sidebar visible 60px, rail OK, R2 OK |

## 2A. Scripts CDP (Fase 5)

Scripts en `cdp/`:
- `cdp_smoke.js` — login admin → 0 errores console → navbar/rail/landing (C1, C2, C5) ✅
- `cdp_drawer.js` — viewport 375px → toggle/backdrop/Escape (C7) ✅
- `cdp_settings.js` — BUG-S-012: Ajustes navega en móvil (C8) ✅
- `cdp_drawer_nav.js` — drawer cierra al navegar (C11 / S-013) ✅
- `cdp_hover.js` — hover flyout estable por coordenadas reales (C3 / S-014) ✅
- `cdp_layout.js` — R2 accumulation check (C12) ✅ límite del selector: `.o_main` no presente en Odoo 19; se mide rail/action_manager/content (correcto). ⚠️ BUG-S-020: sin `setViewport` → falsa alarma breakpoint a 800px
- `cdp_allapps.js` — panel "Todas las aplicaciones" abre/cierra por coordenadas (C6) ✅
- `cdp_matrix.js` — matriz manual automatizada: admin/ventas/basic landing + rail, drawer + SwitchCompany + Escape, teclado ✅
- `cdp_fullscreen.js` — fullscreen action real → sidebar oculta/restaura + navbar core (C9 / S-011a / S-018) ✅
- `cdp_smoke.js` — ⚠️ BUG-S-020: cuenta `.o_erpico_rail_btn` con `$$` (presencia DOM, no visibilidad) en viewport 800×600 → rail no visible; green no prueba visibilidad

Ejecución:
```bash
docker compose -f compose.test.yml up -d
node cdp/cdp_smoke.js
node cdp/cdp_drawer.js
node cdp/cdp_settings.js
node cdp/cdp_drawer_nav.js
node cdp/cdp_hover.js   # C3 / S-014
node cdp/cdp_layout.js  # R2
node cdp/cdp_allapps.js # C6 allApps panel
node cdp/cdp_fullscreen.js # C9 / S-011a / S-018
node cdp/cdp_matrix.js  # matriz manual (admin/ventas/basic)
```

---

## 3. Matriz manual (spec §7.3 — Fase 5)

Ejecutada vía **CDP `cdp_matrix.js`** (usuarios reales creados en `sidebar_test`):

| Dimensión | Caso ejecutado | Resultado |
|---|---|---|
| Usuario admin | login → landing Dashboards; drawer abre; SwitchCompany footer; Escape cierra | ✅ |
| Usuario ventas (no-admin, salesman) | landing (accede Dashboards → D-24); rail filtrado 11 apps; sin "Ajustes" | ✅ |
| Usuario básico (solo Internal User) | landing Dashboards (app pública a internos); rail renderiza | ✅ |
| Landing no-admin sin Dashboards | fallback `super()` — no observado porque `spreadsheet_dashboard_menu_root` **no tiene grupos** → todo usuario interno accede | ⚠️ no aplica (env) |
| Multiempresa | `SwitchCompanyMenu` renderiza en footer drawer (dropdown nativo) | ✅ |
| Teclado | Escape cierra drawer/flyout/allApps; rail btn `tabIndex>=0` (enfocable) | ✅ |
| Mobile | 375px → drawer + backdrop + Escape | ✅ (cdp_drawer.js/cdp_matrix) |
| Apps instaladas/desinstaladas | rail filtra por `getApps()` runtime (12/13, D-20) | ✅ |

**Regresión debranding** (spec riesgo 5) — ejecutada en stack `sidebar_test`:
```bash
docker exec -i odoo_sidebar_test odoo -d sidebar_test --db_host=db_sidebar_test \
  --db_user=odoo --db_password=odoo -u erpico_debranding,erpico_debranding_sale,erpico_debranding_pos \
  --test-enable --test-tags=erpico_debranding --http-port=8090 --no-http --stop-after-init
```
- Resultado: **2 FAIL + 1 ERROR de 22** (ver **BUG-S-017**).
- **Baseline sin sidebar** (BD `sidebar_baseline` clon, módulo desinstalado): **3 FAIL + 1 ERROR** — los 3 fallos se reproducen idénticos **sin el sidebar** → preexistentes del entorno/build Odoo 19 (20260908), NO introducidos por `erpico_web_sidebar`.
- Conclusión: riesgo 5 cubierto — **el sidebar no rompe la suite debranding**.

---

## 4. Cobertura fuerte / huecos

**Fuerte (v1):** QA runtime CDP (los bugs JS solo se cazan en browser real — lección BUG-011).

**Huecos aceptados (v1):**
- Sin tests QUnit (APP_MAP, patch landing, filtros D-12) → candidatos QUnit v2.
- Sin tour Odoo.
- Sin tests Python (módulo 100% frontend, sin modelos → no aplica `ir.model.access` ni HttpCase propio).
- **Pendiente S-019 (flyout):** CDP para verificar que el mouse dentro del flyout lo mantiene abierto (ahora solo probe manual; fix aún no aplicado).
- **Pendiente S-023 (topbar módulo):** CDP tras implementar: al entrar a un módulo → breadcrumbs portal `.o_navbar_breadcrumbs` poblado + `o_menu_brand` con `currentApp.name` + `.o_menu_sections` visible (≥992px); C10 (systray) sin regresión.

---

## 5. Convención

- Todo bug de QA va a `Bugs.md` con ID `BUG-S-XXX` **antes** de arreglarlo.
- CDP: adjuntar/pegar salida de consola (0 errores) como evidencia en `Changelog.md`.
- Al cerrar Fase 5, actualizar el resumen de §1 con fecha y resultado real.

---

## 2B. Cobertura v1.1 — rail por entradas + home (2026-09-26)

### Unit (hoot — `web.assets_unit_tests`, `static/tests/nav_entries.test.js`)

| # | Test | Cubre | Estado |
|---|---|---|---|
| U1 | Índice xmlid → menú sobre `getAll()` | D-30 (no hay lookup por xmlid en core) | ✅ |
| U2 | Orden de `NAV_MAP` + descarte de entradas sin permiso | D-29 / D-30 | ✅ |
| U3 | Ventas cae al xmlid candidato siguiente (root `active="False"`) | D-29 / R-N1 | ✅ |
| U4 | Marketing: 2 grupos; 1 grupo si falta SMS | D-32 | ✅ |
| U5 | `appIds` para la marca activa | D-29 | ✅ |
| U6 | `resolveLeaf`: propia acción / descendente / sin acción | D-13 | ✅ |
| U7 | Cards del home filtradas por permisos | D-33 / D-30 | ✅ |
| U8 | Iconos de marca por xmlid | D-11 | ✅ |

Ejecutados también en Node con un `menuService` simulado (12 asserts, todo OK) para no depender del
stack Docker. Correr en Odoo: `--test-enable --test-tags /erpico_web_sidebar` (eso sólo cubre tests
Python: el módulo no tiene, da `0 tests`). Los tests Hoot corren en browser.

**Hoot en browser (`/web/tests?module=erpico_web_sidebar`): NO VERIFICADO en este entorno.**
Al abrir el runner con Puppeteer la página monta `HOOT-CONTAINER` pero no ejecuta los tests
(`odoo.loader.modules` = 64, sin factories de Hoot cargadas) y el loader reporta
`modules needed by other modules but have not been defined:
[@erpico_web_sidebar/static/src/sidebar/nav_entries]`. Causa pendiente de investigación: el
wrapper `hoot_module_loader.js` renombra los módulos con sufijo `" (hoot)"` y las dependencias
declaradas por los tests no se resuelven. **Fix ya aplicado** (sí era un bug real del manifest):
`nav_entries.js` debe estar explícito en `web.assets_unit_tests`, porque el bundle de tests no
arrastra `web.assets_backend`; sin eso el error de dependencia ocurre siempre. La cobertura
efectiva de la lógica JS queda en (a) los asserts Node y (b) la suite CDP E2E, que ejercita la
UI real.

### Runtime (CDP — ejecutado 2026-09-26 contra Docker, Odoo 19.0-20260908, puerto 8071)

| # | Check | Cubre | Script | Estado |
|---|---|---|---|---|
| C13 | `/odoo` renderiza `.o_erpico_home` (landing = home, no dashboards) | D-33 | `cdp_home.js` | ✅ |
| C14 | Home muestra exactamente 2 cards en orden (Dashboards, CRM) | D-33 | `cdp_home.js` | ✅ |
| C15 | Click en cada card navega a la app destino | D-33 | `cdp_home.js` | ✅ |
| C16 | Orden del rail = 10 entradas de `NAV_MAP` (por `aria-label`) | D-29 | `cdp_allapps.js` (A6 reescrito) | ✅ |
| C17 | Usuario sin POS/stock/sales → los íconos **no** aparecen | D-30 | `cdp_matrix.js` (reescrito) | ✅ |
| C18 | Fullscreen/drawer siguen OK con `isEntryActive` | R-N3 | `cdp_fullscreen.js`, `cdp_drawer_nav.js` | ✅ |

### Resultado real de la suite CDP (2026-09-26)

Los 10 scripts pasan: `cdp_home`, `cdp_allapps`, `cdp_smoke`, `cdp_hover`, `cdp_drawer`,
`cdp_drawer_nav`, `cdp_layout`, `cdp_fullscreen`, `cdp_settings`, `cdp_matrix`.

Evidencia de C17 (matriz de permisos, logins reales verificados por `get_session_info().uid`):

| Usuario | Grupos | Rail observado | Home |
|---|---|---|---|
| `admin` (uid 2) | `base.group_system` | 10 entradas (orden D-29) | 2 cards |
| `ventas` (uid 17) | `base.group_user` + `sales_team.group_sale_salesman` | 5: Inicio, CRM, Ventas, Ecommerce, Website | 2 cards |
| `basic` (uid 18) | `base.group_user` | 2: Inicio, Website | 1 card (CRM filtrado) |

`Website` aparece para `basic` porque `website.menu_website_configuration` sólo exige
`Role / User`, grupo que core concede a los internal users: el sidebar refleja core, no lo oculta.

### Trampas de Odoo 19 encontradas al validar (importante para cualquier test CDP)

1. **`/web/logout` no existe** (404). La ruta correcta es **`/web/session/logout`**. Con la ruta
   vieja la sesión anterior sobrevive: los checks de permisos corrían con el usuario previo y
   daban falsos verdes (`cdp_matrix.js` reportaba 10 entradas para `basic`).
2. **Un login por contexto de browser aislado.** Reutilizar la misma pestaña para 3 logins deja el
   form de login sin JS funcional (el click no emite POST) y cuelga la navegación. `cdp_matrix.js`
   ahora usa `browser.createBrowserContext()` por usuario.
3. **`res.users.password` es campo computado.** `write({'password': ...})` y
   `write({'new_password': ...})` no hashean nada vía `odoo shell`; hay que usar
   `user._set_encrypted_password(user.id, ctx.hash(pw))` y `env.cr.commit()` — ojo: `odoo shell`
   hace **rollback** al salir, así que sin commit los usuarios no existen.
4. **Login en Odoo 19 es un formulario HTML plano**, no el webclient: esperar a que el botón sea
   visible y a que `window.odoo` exista antes de hacer click, si no falla con
   "Node is either not clickable or not an Element".
5. **`odoo shell` hace rollback**: cualquier alta de datos de prueba (usuarios, etc.) necesita
   `env.cr.commit()` explícito o no persiste.
6. **RPC JSON**: `fetch('/web/session/get_session_info', {...})` responde 415 si no se manda
   `Content-Type: application/json` + `X-Requested-With: XMLHttpRequest`.
7. **Assets cacheados en memoria del proceso**: tras cambiar `__manifest__.py` hay que **reiniciar
   el contenedor** de Odoo; `-u` no refresca el manifest cacheado y el bundle se regenera con el
   contenido viejo.

### Estado de la BD de QA (`sidebar_test`, entorno local, no afecta al repo)

- Instalados para poder validar: `sale_management` (activa `sale.sale_menu_root`, que nace
  `active="False"`) y `mass_mailing_sms` (2º grupo de Marketing).
- Usuarios de prueba creados: `ventas` (uid 17) y `basic` (uid 18).
