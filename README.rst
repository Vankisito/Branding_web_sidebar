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

Depende únicamente de ``web``: en una base sin apps de negocio instala y
simplemente muestra menos entradas.

Subaddon de roles
-----------------

``roles/erpico_web_sidebar_roles`` es un módulo Odoo aparte, dentro de este
repositorio, con los grupos de permisos por aplicación (CRM y Ventas, POS,
Inventario, Compras, Website). Es **opcional** y es el único que arrastra
dependencias de módulos de negocio, para que el sidebar se pueda instalar en
cualquier base.

Instalación
-----------

.. code-block:: bash

    odoo -d <db> -i erpico_web_sidebar

Con roles (los módulos anidados no se descubren solos: hay que añadir el
directorio ``roles`` al ``addons_path``):

.. code-block:: bash

    odoo --addons-path=<addons>,<addons>/erpico_web_sidebar/roles -d <db> -i erpico_web_sidebar_roles

Más información
---------------

Vea ``readme/DESCRIPTION.rst``, ``readme/USAGE.rst`` y
``readme/CONTRIBUTORS.rst`` para detalles adicionales.

Cambios
-------

Vea ``readme/CHANGELOG.rst`` para el historial de versiones.
