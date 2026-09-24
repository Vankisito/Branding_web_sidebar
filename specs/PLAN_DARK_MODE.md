# Plan de Implementación — Dark/Light Mode Toggle en Topbar

**Módulo:** `erpico_web_sidebar` (Odoo 19 Community)
**Autor:** Habitat Digital
**Estado:** `[DRAFT]` → pasar a `[APROBADO]` cuando el equipo valide
**Versión target:** `19.0.2.0.0`
**Archivo de decisiones vinculado:** `specs/Decisiones.md` (nueva entrada `D-29`)
**Referencias core confirmadas:** ver §3 (rutas exactas del código Odoo 19 del contenedor)

---

## 1. Objetivo

Agregar un botón en la topbar que permita al usuario alternar entre **modo
claro** y **modo oscuro** de todo el backend de Odoo, en una sola instancia
Community 19, _sin_ depender del toggle nativo (que solo existe en Enterprise).

El toggle debe:

- Cambiar el color scheme de **todo el backend** (no solo el sidebar).
- Persistir la elección del usuario (cookie).
- Respetar el brandbook ERPICO (topbar y sidebar invariables en ambos modos).
- Ser accesible (teclado + `aria-*`).

---

## 2. Alcance

| Incluye | No incluye |
|---|---|
| Botón toggle en topbar (desktop + mobile) | Cambio de theme por-empresa o por-compañía |
| Override Python de `color_scheme()` | Dark mode "auto" (seguir `prefers-color-scheme` del SO) |
| Cookie `color_scheme` persistente | Soporte de N themes (solo light/dark) |
| CSS propio para el botón (brandbook) | Cambios al sidebar/topbar en sí |
| Tests CDP de validación | Edición de core/seed (prohibido por D-18) |

---

## 3. Mecanismo Odoo 19 (investigado, verificado en contenedor)

> Todo esto se confirmó leyendo el código real del contenedor de test. No es
> conjetura — usar estas rutas al implementar.

| Pieza | Ruta / código core | Comportamiento |
|---|---|---|
| **Hook del theme** | `odoo/addons/web/models/ir_http.py:77` | `def color_scheme(self): return "light"` en Community. **Hookar aquí**. |
| **Bundle dark** | `web/__manifest__.py:346` `web.assets_web_dark` | `[('include', 'web.assets_web'), */*.dark.scss]`. Nuestro SCSS está en `web.assets_backend` → se incluye en ambos bundles. |
| **Decisión de bundle** | `odoo/addons/web/views/webclient_templates.xml:300-305` | `t-if="color_scheme == 'dark'"` → carga `web.assets_web_dark`, si no el bundle claro. |
| **Cookie ya soportada** | `base/models/ir_ui_view.py:2715`, `base/models/ir_actions.py:495` | Leen `request.cookies.get('color_scheme') == 'dark'` (uso para diffs de vistas/código). |
| **Offline page** | `webclient_templates.xml:321` | Ya lee cookie `color_scheme=dark` para pintar fondo oscuro offline. |

### 3.1 Implicaciones clave (evitar errores de diseño)

1. **No existe clase `o_theme_dark` en el html/body.** El dark mode de Odoo 19
   es por **bundle CSS** (`.dark.scss` que sobrescriben variables), decidido en
   render server-side vía `color_scheme()`. Cualquier plan que togglee una clase
   CSS "a mano" está mal — hay que cambiar el valor devuelto por `color_scheme()`.
2. Al alternar, es obligatorio **`location.reload()`** porque el bundle CSS a
   cargar se decide en el servidor. No hay hot-swap de CSS.
3. El override se hace en un **modelo Python** (`ir.http`), nuevo para este
   módulo (hoy `erpico_web_sidebar` no tiene carpeta `models/`).
4. Bump de versión obligatorio (`19.0.1.0.3` → `19.0.2.0.0`) para forzar
   re-instalación y recarga de assets (los `.py` nuevos exigen `-u`).

---

## 4. Arquitectura de la solución

```
┌─────────────────────────────────────────────────────────────┐
│  frontend: navbar.xml (patch NavBar)                         │
│    button.o_erpico_theme_toggle (sol/luna)                   │
│    onclick → navbar.js: setCookie('color_scheme') + reload() │
├─────────────────────────────────────────────────────────────┤
│  backend: models/ir_http.py                                  │
│    IrHttp.color_scheme() override                            │
│      lee cookie 'color_scheme' → 'dark'  o  'light'         │
├─────────────────────────────────────────────────────────────┤
│  core Odoo: webclient_templates.xml:300                      │
│    color_scheme=='dark' → carga web.assets_web_dark          │
└─────────────────────────────────────────────────────────────┘
```

- **Persistencia:** cookie `color_scheme=dark` (path `/`, `max-age` ~1 año,
  `SameSite=Lax`). Suficiente, sin tocar RPC ni modelos.
- **Ícono dinámico:** el botón muestra sol si está oscuro, luna si está claro.
  Estado leído de la cookie al construir el template (patrón NavBar OWL).

---

## 5. Fases de implementación

Cada fase tiene checklist con verificación **ejecutada** (regla: `Plan de
Desarrollo.md` §1 — no marcar `[x]` sin ejecutar). Orden de trabajo estricto.

---

### Fase 0 — Preparación

- [ ] Crear `models/` en raíz del módulo:
  - `models/__init__.py` → `from . import ir_http`
  - `models/ir_http.py`
- [ ] Editar `__init__.py` raíz: `from . import models` (existe hoy, verificar si ya lo importa).
- [ ] Bump `__manifest__.py`: `19.0.1.0.3` → `19.0.2.0.0`.
- [ ] Reinstalar módulo con `docker exec odoo_sidebar_test odoo -u erpico_web_sidebar` (o `-i` para models nuevos).
- [ ] **Verificar:** sube el servidor sin traceback y `/odoo` carga.

**Detalle de `models/ir_http.py`:**

```python
from odoo.http import request
from odoo.addons.web.models.ir_http import IrHttp  # noqa: F401  (register)

class IrHttp(IrHttp):
    def color_scheme(self):
        scheme = request and request.httprequest.cookies.get('color_scheme')
        return 'dark' if scheme == 'dark' else 'light'
```

> ⚠️ Revisar al implementar: la clase en `web/models/ir_http.py` es
> `models.AbstractModel`, `_inherit = 'ir.http'`. El override debe repetir el
> `_inherit` (heredar la clase web, no la base). El import hook arriba basta si
> ambos se registran en orden de dependencia (web primero).

---

### Fase 1 — Botón en `navbar.xml` (template NavBar patch)

- [ ] Agregar botón **antes** del div `.o_menu_systray` (queda a la derecha, pegado al systray; no usar `ms-auto` extra porque el systray ya lo tiene).
- [ ] Estado inicial: leer cookie `color_scheme` en JS del componente (property computada o `willStart`) y pintar el ícono correcto.
- [ ] `aria-label` dinámico + `aria-pressed="${isDark}"`.
- [ ] Título (`title`) tooltip "Modo claro / Modo oscuro".

**Template de referencia (encima de `.o_main_navbar`, patrón D-28):**

```xml
<button class="o_erpico_theme_toggle"
        t-att-aria-pressed="isColorSchemeDark"
        t-att-aria-label="isColorSchemeDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        t-att-title="isColorSchemeDark ? 'Modo claro' : 'Modo oscuro'"
        t-on-click="onToggleColorScheme">
    <i class="fa" t-att-class="'fa-sun-o' if isColorSchemeDark else 'fa-moon-o'" aria-hidden="true"/>
</button>
```

---

### Fase 2 — Lógica JS en `navbar.js`

- [ ] En el patch actual de `NavBar` agregar:
  - `setup()` → leer cookie (`document.cookie.includes('color_scheme=dark')`) → setear `this.isColorSchemeDark`.
  - `onToggleColorScheme()` → escribir/borrar cookie + `window.location.reload()`.

**Referencia de helpers (no usar `!important` en JS, solo seteo):**

```js
import { patch } from "@web/core/utils/patch";

function setColorSchemeCookie(value) {
    const maxAge = 60 * 60 * 24 * 365; // 1 año
    document.cookie = `color_scheme=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

patch(NavBar, {
    template: "erpico_web_sidebar.NavBar",
    setup() {
        super.setup(...arguments);
        this.isColorSchemeDark = document.cookie.includes("color_scheme=dark");
    },
    onToggleColorScheme() {
        setColorSchemeCookie(this.isColorSchemeDark ? "light" : "dark");
        window.location.reload();
    },
});
```

> ⚠️ OWL 3.x: `super.setup(...arguments)` conserva el setup core (systray, icy
> logic). Validar en runtime — no romper el setup original (lección BUG-S-001).

---

### Fase 3 — SCSS del botón (`sidebar.scss`)

- [ ] Añadir bloque `.o_main_navbar .o_erpico_theme_toggle` con tokens brandbook (`$erpico-chalk`, `$erpico-rail-hover`), mismas dimensiones que el toggler móvil, `background: transparent`, `border: 0`.
- [ ] Hover: `background: $erpico-rail-hover`.
- [ ] Padding/icono 18px, alineación vertical central.
- [ ] NO tocar `.o_main_navbar` existente (obsidian va fijo en ambos modos).

---

### Fase 4 — Ensayo manual en stack de test

- [ ] `docker restart odoo_sidebar_test` → esperar HTTP 303 en `/web`.
- [ ] Login `admin/admin` → `/odoo`.
- [ ] Click botón → recarga → **verificar fondo de listas/vistas oscuro** y topbar sigue obsidian.
- [ ] Cookies: `color_scheme=dark` presente, mismo después de F5.
- [ ] Click de nuevo → vuelve a claro.

---

### Fase 5 — Tests CDP automáticos

- [ ] Extender `cdp/check_dropdown.js` (o nuevo `cdp/cdp_theme.js`): login, localizar `.o_erpico_theme_toggle`, click, esperar reload, evaluar:
  - cookie `color_scheme=dark` presente;
  - `getComputedStyle(document.body).colorScheme` o un `.dark.scss` efectivo (ej: fondo de `.o_list_view` oscuro);
  - `.o_main_navbar` bg sigue `rgb(12, 17, 46)` (#0c112e);
  - topbar text sigue `rgb(247, 249, 251)` (#f7f9fb);
  - 0 errores de consola.
- [ ] Repetir toggle a claro y verificar vuelta.
- [ ] Correr suite completa: `cdp_smoke.js`, `cdp_verify_audit.js`, `cdp_layout.js` + nuevo test → todos pasan.

---

### Fase 6 — Documentación y release

- [ ] `readme/CHANGELOG.rst`: entrada `19.0.2.0.0` describiendo el toggle.
- [ ] `specs/Decisiones.md`: nueva decisión `D-29` (elección de cookie+override `color_scheme`, descarte de arel `o_theme_dark`).
- [ ] Commit con mensaje según convención del repo (ver `git log --oneline`).

---

## 6. Riesgos y mitigaciones

| # | Riesgo | Gravedad | Mitigación |
|---|---|---|---|
| R1 | **Override `color_scheme()` no pega** (abstract model / orden de registro web). | 🔴 Alta | Reinstalar con `-u`; verificar tráfico: el bundle en `network` de DevTools debe cambiar de `web.assets_web` a `web.assets_web_dark`. Protein en Fase 0/4. |
| R2 | **`super.setup()` roto** → systray/adapt de NavBar se degradan. | 🔴 Alta | Fase 2 referencia BUG-S-001; smoke test de systray verificará. |
| R3 | **Reload completo del webclient** molesto (se pierde estado de navegación). | 🟡 Media | Aceptado por diseño (mecanismo de bundles lo exige). Opcional futuro: guardar ruta actual pre-reload y restaurar. |
| R4 | **Vistas de terceros sin `.dark.scss`** se ven con contraste mediocre en dark. | 🟡 Media | No es bloqueante: dark cubre web + módulos Oficiales. Documentar en CHANGELOG como limitación. |
| R5 | **Topbar/sidebar brandbook desafiado** por overrides dark de core. | 🟡 Media | Nuestras reglas usan tokens + selectores específicos; verificación CDP de `rgb(12,17,46)` y `rgb(247,249,551)` en Fase 5 blinda el brand. |
| R6 | **Cookie no persiste** (borrado de sesión / `SameSite`). | 🟢 Baja | `max-age` + `SameSite=Lax`; verificación en Fase 4. |
| R7 | **Accesibilidad** (contraste botón en navbar oscura). | 🟡 Media | Ícono `$erpico-chalk` sobre obsidian (contraste ya validado); `aria-pressed`+label en Fase 1. |

**Rollback:** revertir commit + `docker exec odoo_sidebar_test odoo -u erpico_web_sidebar` y `docker restart`. No toca core → limpio.

---

## 7. Checklist final (gate de release)

- [ ] Fase 0..6 completadas y verificadas en runtime.
- [ ] `cdp_smoke.js` ✅ 0 errores de consola.
- [ ] `cdp_theme.js` ✅ toggle ida y vuelta, navbar invariante.
- [ ] Versión `19.0.2.0.0` en manifest + CHANGELOG + Decisiones (D-29).
- [ ] Sin ediciones a archivos de seed (D-18).
- [ ] Commit único, mensaje descriptivo.
- [ ] Este plan marcado `[COMPLETADO]`.

---

## 8. Notas para el implementador (antipatrones a evitar)

1. **No** togglear una clase `.o_theme_dark` a mano — no existe en Odoo 19; el
   scheme se decide por bundle en servidor.
2. **No** intentar hot-swap de CSS sin reload — el bundle dark no está linkeado
   hasta que el servidor lo decida.
3. **No** hardcodear colores hex en JS — los tokens SCSS son fuente única.
4. **No** colocar el botón dentro de `.o_menu_systray` (se renderiza por
   items core) — va como hermano, antes del div.
5. Mantener el botón `aria-pressed` sincronizado con `isColorSchemeDark` para
   lectores de pantalla.