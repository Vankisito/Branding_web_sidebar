# CDP QA — `erpico_web_sidebar`

Scripts de QA runtime sobre Puppeteer contra una instancia Odoo 19.
No forman parte del módulo Odoo: son tooling de desarrollo.

## Requisitos

- Node con las deps del repo: `cdp/node_modules` (`npm install` en `cdp/`).
- Instancia Odoo 19 levantada (el stack de QA local escucha en el puerto 8071).
- `erpico_web_sidebar_roles` instalado: es un módulo **anidado** en
  `roles/erpico_web_sidebar_roles/`, y Odoo escanea el `addons_path` de un solo
  nivel, así que hace falta `<addons>/erpico_web_sidebar/roles` en el path.

## Configuración (BUG-S-029)

URL y credenciales salen de variables de entorno; los defaults apuntan a una BD
**local desechable**, no hay secretos reales en el repo:

| Variable | Default | Para qué |
|---|---|---|
| `ODOO_URL` | `http://localhost:8071` | base de la instancia (sin `/` final) |
| `ODOO_USER` / `ODOO_PASSWORD` | `admin` / `admin` | login por defecto |
| `ODOO_USER_VENTAS` / `ODOO_PASS_VENTAS` | `ventas` / `ventas` | usuario de la matriz de permisos |
| `ODOO_USER_BASIC` / `ODOO_PASS_BASIC` | `basic` / `basic` | usuario de la matriz de permisos |
| `ODOO_UID_ADMIN` / `ODOO_UID_VENTAS` / `ODOO_UID_BASIC` | `2` / `17` / `18` | uids que espera `cdp_matrix.js` |
| `ODOO_DB` | `sidebar_test` | BD, usada por `check_menu_leak.js` (jsonrpc) y `seed_users.py` |

```powershell
$env:ODOO_URL = "https://mi-odoo.example.com"
$env:ODOO_PASSWORD = "..."
node cdp_smoke.js
```

Todo se centraliza en `cdp/qa_config.js`; los scripts sólo importan de ahí.

## Usuarios de la matriz (cdp_matrix.js)

`cdp_matrix.js` necesita `ventas` y `basic` con grupos exactos. `cdp/seed_users.py` los
crea/repara — es idempotente. Los roles "… ERPICO" los resuelve por XMLID
(`erpico_web_sidebar_roles.group_*_erpico`), así que **el subaddon
`roles/erpico_web_sidebar_roles` tiene que estar instalado**; si no, el script avisa y
deja a los usuarios con `base.group_user` solamente:

| login | grupos | para qué |
|---|---|---|
| `ventas` | `Role / User` + `sales_team.group_sale_salesman` + rol CRM y Ventas ERPICO | matriz de permisos, usuario sin apps de inventario |
| `basic` | `Role / User` + los grupos **usuario** de Ventas, Inventario, Compras y POS (**ningún manager**) | es el usuario con el que se calibraron los 122 menús, el rail de 9 items y las expectativas de `check_report_menus.js` |
| `inv` | `Role / User` + rol Inventario ERPICO, nada más | único usuario QA con `stock.group_stock_user` y **sin** `product.group_product_variant`, que es el gate nativo de `stock.product_product_menu`. Por eso es el que prueba `product_menus.xml`: `basic` ya tenía ese grupo por otras vías y no distinguiría nada (BUG-S-056, D-41) |

> `basic` estuvo un tiempo seedeado como `[]`, o sea usuario interno pelado, y el README
> lo describía así. Eso rompía el baseline de la suite entera (rail de 2 entradas en vez de
> 9) — ver BUG-S-056.

```powershell
Get-Content cdp/seed_users.py -Raw | docker exec -i odoo_sidebar_test odoo shell -d sidebar_test --no-http --log-level=error --db_host=db_sidebar_test --db_user=odoo --db_password=odoo
docker restart odoo_sidebar_test
```

**El reinicio es obligatorio**: el acceso a menús está cacheado en el proceso del
servidor (`ir.ui.menu._get_menu_ids_for_user` es `ormcache`) y el seed corre en
otro proceso. Sin reinicio la matriz falla con datos ya corregidos.

## Fixture de permisos esperada (`cdp/expected_rail.js`)

`cdp_matrix.js` **no** compara el rail contra `static/src/sidebar/nav_entries.js`:
eso sería un test tautológico (comparar la constante con sí misma). Compara
contra `expected_rail.js`, una copia escrita a mano a propósito, y de paso
comprueba que cada botón exponga los XMLIDs que dice representar
(`data-entry`, `data-xmlids`).

Si cambias `NAV_MAP`, actualiza `expected_rail.js` también: si no, la matriz falla
a propósito, que es justo el punto de tener la fixture aparte.

## Códigos de salida

Todos los scripts que corren checks terminan con **código 1** si algún check
falló (o si hubo un error JS en la página), aunque el reporte en consola se vea
verde. Sirve para CI: `node cdp_matrix.js; if ($LASTEXITCODE -ne 0) { ... }`.
Un script que no tiene checks (`check_dropdown*.js`) siempre sale con 0.

## Trampas conocidas de Odoo 19 (ver `specs/TESTS_COVERAGE.md`)

1. El logout es `POST /web/session/logout`; `/web/logout` da 404 y deja viva la
   sesión anterior → checks falsos verdes.
2. Un login por contexto de browser aislado (`browser.createBrowserContext()`):
   re-loguear en la misma pestaña deja el form sin JS funcional y cuelga.
3. El login es un form HTML plano: esperar a que el botón sea visible y a que
   `window.odoo` exista antes del click.
4. Tras editar JS o `__manifest__.py` hay que **reiniciar el contenedor**: el
   bundle de assets se cachea en memoria.
5. El RPC JSON exige `Content-Type: application/json` +
   `X-Requested-With: XMLHttpRequest` (si no, 415).

## Scripts

| Script | Qué valida |
|---|---|
| `cdp_home.js` | Home como landing: 2 cards en orden, cada una navega |
| `cdp_allapps.js` | Panel "Todas las aplicaciones" y orden del rail |
| `cdp_smoke.js` | Render del componente, sin errores de consola |
| `cdp_hover.js` | Flyout de submenús (abre, estable, cierra) |
| `cdp_drawer.js` | Drawer móvil: entradas, grupos, backdrop, Escape |
| `cdp_drawer_nav.js` | El drawer cierra al navegar |
| `cdp_drawer_reporting.js` | Drawer móvil recursivo: "Reportes" con sus hojas, grupos a depth ≥ 2, y navegación |
| `cdp_productos_dom.js` | La entrada "Productos" dibuja sus submenús como items navegables, en drawer (375px) **y** flyout (1440px), sin cabeceras de grupo |
| `cdp_layout.js` | Rail de 60px, sin acumulación de margen |
| `cdp_fullscreen.js` | Ocultar/restaurar rail en acciones fullscreen |
| `cdp_settings.js` | Ajustes navega a `/odoo/settings` y cierra el drawer |
| `cdp_matrix.js` | Matriz de permisos (admin / ventas / basic) |
| `cdp_hoot.js` | Runner de Hoot. **No funciona en este entorno**: el runner de `/web/tests` no ejecuta los tests con Puppeteer. No usar como criterio de verde |
| `cdp_verify_audit.js` | Auditoría del topbar contra el core |
| `cdp_verify_keyboard.js` | Drawer por teclado, cierre con mouseleave/Escape |
| `check_dropdown*.js` | Verificación puntual del toggle del topbar |
| `check_menu_leak.js` | Diagnóstico: compara `load_menus` entre usuarios (ver abajo) |
| `check_report_menus.js` | Contrato de permisos de Reportes contra `load_menus` (C14, C15) |
| `check_product_menus.js` | Contrato de permisos de Producto contra `load_menus` (C19) |
| `seed_users.py` | Crea/repara los usuarios de la matriz (ver arriba) |

## `check_product_menus.js` (permisos de Producto)

Contrato de D-41. Corre en cuatro usuarios: `admin`, `ventas`, `basic` e `inv`.

```powershell
node check_product_menus.js                        # admin,ventas,basic,inv
node check_product_menus.js inv,basic              # otro subconjunto
```

Verifica que los 4 submenús existen en `load_menus`, que cuelgan del padre esperado, y dos
controles de escalada: *Configuration* de Inventario y de Ventas siguen ausentes, y Categorías
de producto tampoco aparece (se decidió con el cliente no abrir Configuration para incluirla).

`inv` es el caso con valor real: es el único usuario sin `product.group_product_variant`, o sea
sin el gate nativo de *Variantes*. Si `product_menus.xml` no hiciera nada, "Variantes" no
aparecería. Y como tampoco tiene `sales_team.group_sale_salesman`, se ve recortado a 2 items y
no arrastra las apps Ventas ni Website al rail (`sale.sale_menu_root` ausente).

## `check_report_menus.js` (permisos de Reportes)

Valida el contrato de D-40 contra `/web/webclient/load_menus`, que es lo único que el
sidebar consume: si el backend no manda el menú, el sidebar no lo puede inventar.

```powershell
node check_report_menus.js                 # admin,ventas,basic
node check_report_menus.js ventas,basic     # otro subconjunto
```

Comprueba tres cosas, no dos:

- presencia/ausencia de cada nodo de Reportes y de los dos *Configuration* de control;
- que cada nodo **cuelgue del padre esperado**, para que no sea un menú huérfano que aparece en el
  payload pero no se puede alcanzar (esto es lo que destapó BUG-S-054);
- que *Configuration* siga ausente para quien no es manager, que es la contra-prueba de que abrir
  Reportes no abrió de más.

Las expectativas están escritas a mano a partir de los grupos reales de cada usuario, no
generadas desde el resultado: autogenerar la fixture haría que el test pasara siempre.

## `cdp_drawer_reporting.js` (drawer recursivo)

Corre como `basic` a 375px porque es el usuario que tiene a la vez los grupos de usuario de
Ventas, Inventario, Compras y POS. Los otros scripts de drawer corren como `admin`, y con el
admin **ninguna** app produce la rama anidada de Reportes, así que la parte recursiva del
template quedaba sin ejercitar.

Dos detalles que costaron un rato y están explicados en el encabezado del script:

- los clicks van por `element.click()` dentro de la página, no por `page.click()`: el toggle vive en
  `.o_main_navbar` con `rect.y === 0` y a 375px el click por coordenadas no lo alcanza (el evento no
  llega ni a fase capture del document);
- el sidebar rotula la sección **"Reportes"** en español, no "Reporting" como se llama el nodo en el
  core.

## `check_menu_leak.js` (diagnóstico, no es verde/rojo del addon)

Compara el set de menús que devuelve `/web/webclient/load_menus` para varios
usuarios. No valida el sidebar: valida que el backend filtre por permisos.

```powershell
node check_menu_leak.js                      # admin,ventas,basic,basic,ventas,admin
node check_menu_leak.js admin,ventas,basic   # otro orden
```

Tiene tres guards para no dar diagnósticos falsos: valida `res.ok` en
`authenticate` y en `load_menus`, exige `uid` antes de usar la sesión (si no,
estaría comparando el set de menús de la sesión anterior), y avisa en vez de
acusar fuga cuando sólo hay un usuario no-admin para comparar. Sale con código 1
si algún login falla o si detecta la fuga.

**Histórico:** con los grupos de la 1.2.0 (sin `privilege_id` y mal seedados)
`ventas` y `basic` recibían los mismos 74 menús. Con `erpico_web_sidebar_roles` y
el seed correcto cada uno recibe lo suyo. Tras D-40 (que destapa Reportes a los
usuarios de cada app) los números son **admin 259, ventas 80, basic 122**, y el
script sale con 0. Que `basic` reciba más que `ventas` es lo esperado: `basic` tiene
los grupos de usuario de las cuatro apps, `ventas` sólo el de Ventas. Si la fuga
vuelve, el problema está en los grupos o en el seed, no en el sidebar.
