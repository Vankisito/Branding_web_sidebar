ERPICO Web Sidebar
==================

Navegación tipo Tiendanube para el backend de Odoo 19.

- Rail izquierda con iconos de app de la marca ERPICO.
- Flyout con submenús reales de cada aplicación.
- Topbar mínima: brand ERPICO + systray de Odoo.
- Landing del administrador en la app Dashboards.
- Drawer móvil con acordeón de aplicaciones y backdrop.

Módulo 100% frontend: sin modelos Python. Overrides por herencia de
template, registry ``main_components`` y patch de ``WebClient``.
Compatible OCA; jamás modifica el código de Odoo.

Instalación
-----------

.. code-block:: bash

    odoo -d <db> -i erpico_web_sidebar

Más información
---------------

Vea ``readme/DESCRIPTION.rst``, ``readme/USAGE.rst`` y
``readme/CONTRIBUTORS.rst`` para detalles adicionales.

Cambios
-------

Vea ``readme/CHANGELOG.rst`` para el historial de versiones.
