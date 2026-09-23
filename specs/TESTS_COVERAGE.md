# Cobertura de Pruebas — Módulo `erpico_web_sidebar`

> Estado de la QA al cierre de las **Fases 0–1** (2026-09-23): stack Docker
> `sidebar_test` funcionando y bugs críticos S-001/S-002/S-003 resueltos con
> evidencia CDP.
>
> **Última actualización:** 2026-09-23 — CDP smoke básico ✅; matriz manual y
> regresión debranding pendientes (Fase 5).

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
| C1 | Login admin → `/odoo` → **0 errores de consola** | S-001, S-002, S-003, crash de assets | ✅ (2026-09-23) |
| C2 | Rail visible con apps del `APP_MAP` (D-20) | S-001, S-008 | ✅ 12 botones |
| C3 | Hover rail → flyout abre con submenús reales | M2 / D-13 | ⏳ Fase 5 |
| C4 | Clic submenú → navega (cambio de vista) | D-13 | ⏳ Fase 5 |
| C5 | Landing admin = Dashboards; no-admin = default | S-002 / D-10 | ✅ `/odoo/dashboards?dashboard_id=3` (admin) |
| C6 | Dump `menuService.getApps()` → xmlids confirmados | D-20 (provisionales) | ✅ todos confirmados (ver D-20) |
| C7 | Viewport 375px → toggle → drawer abre; backdrop/Escape cierran | S-004, S-005 | ⏳ Fase 2 |
| C8 | Footer: Ajustes navega; SwitchCompanyMenu abre dropdown | S-006, S-007 / D-15 | ⏳ Fase 2 |
| C9 | Fullscreen report → sidebar oculta; salir → restaura | S-011 | ⏳ Fase 4 |
| C10 | Systray intacto (buscador, campana, usuario) | D-14 / S-011 (NavBar patch) | ✅ navbar renderiza; resto visual → manual |

## 3. Matriz manual (spec §7.3 — Fase 5)

| Dimensión | Casos |
|---|---|
| Usuario | admin (`base.group_system`) · usuario ventas (no-admin) |
| Apps | instaladas / desinstaladas (rail filtra, allApps muestra) |
| Multiempresa | footer Cambiar empresa con 2+ empresas |
| Teclado | Escape cierra flyout/drawer; Tab/foco en rail |
| Mobile | 375px drawer + backdrop + acordeón |
| Regresión cruzada | suite `erpico_debranding` verde con sidebar instalado |

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
