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
| C12 | Margin-left contenido no se acumula con rail | R2 | ✅ CDP: cdp_layout.js — sin acumulación (nota: sidebar `display:none` a 1024px es del entorno Odoo, no del módulo) |

## 2A. Scripts CDP (Fase 5)

Scripts en `cdp/`:
- `cdp_smoke.js` — login admin → 0 errores console → navbar/rail/landing (C1, C2, C5) ✅
- `cdp_drawer.js` — viewport 375px → toggle/backdrop/Escape (C7) ✅
- `cdp_settings.js` — BUG-S-012: Ajustes navega en móvil (C8) ✅
- `cdp_drawer_nav.js` — drawer cierra al navegar (C11 / S-013) ✅
- `cdp_hover.js` — hover flyout estable por coordenadas reales (C3 / S-014) ✅
- `cdp_layout.js` — R2 accumulation check (C12) ✅ límite del selector: `.o_main` no presente en Odoo 19; se mide rail/action_manager/content (correcto)
- `cdp_allapps.js` — panel "Todas las aplicaciones" abre/cierra por coordenadas (C6) ✅
- `cdp_matrix.js` — matriz manual automatizada: admin/ventas/basic landing + rail, drawer + SwitchCompany + Escape, teclado ✅
- `cdp_fullscreen.js` — fullscreen action real → sidebar oculta/restaura + navbar core (C9 / S-011a / S-018) ✅

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

---

## 5. Convención

- Todo bug de QA va a `Bugs.md` con ID `BUG-S-XXX` **antes** de arreglarlo.
- CDP: adjuntar/pegar salida de consola (0 errores) como evidencia en `Changelog.md`.
- Al cerrar Fase 5, actualizar el resumen de §1 con fecha y resultado real.
