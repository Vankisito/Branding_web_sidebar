ERPICO Web Sidebar
==================

Navegación tipo Tiendanube para el backend de Odoo 19:

* **Rail** vertical con iconos de aplicación de la marca ERPICO.
* **Flyout** con los submenús reales de cada aplicación (hover / clic / teclado).
* **Topbar mínima**: brand ERPICO + systray de Odoo sin alterar (buscador, notificaciones, usuario).
* **Landing admin** en la app "Dashboards" de Odoo (`spreadsheet_dashboard`).
* **Drawer móvil** (<= 768px) con acordeón de aplicaciones y backdrop.

Módulo 100% frontend: sin modelos Python. Overrides por herencia de template,
registry `main_components` y patch de `WebClient`. Compatible OCA; jamás
modifica el código de Odoo.