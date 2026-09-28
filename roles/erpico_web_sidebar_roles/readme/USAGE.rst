==========================
ERPICO Web Sidebar Roles
==========================

Roles por módulo nativo para el sidebar de ``erpico_web_sidebar`` en Odoo 19.

Descripción
===========

Este módulo no aporta vistas ni lógica de negocio: define cinco grupos de
permisos que conceden acceso de **usuario** a una aplicación, y que se asignan
desde el formulario de usuario bajo la categoría **ERPICO**.

Cada rol implica el grupo ``User`` del módulo nativo correspondiente, de modo que
el menú raíz de esa aplicación le llega al usuario desde el core y el sidebar lo
muestra. Los submenús que Odoo reserva al *Administrator* de cada aplicación
siguen ocultos, sin tocar los menús nativos.

============ ================================================
Rol          Implica
============ ================================================
CRM y Ventas ``sales_team.group_sale_salesman`` (User: Own
             Documents Only), que es el grupo que habilita
             también la raíz de CRM, porque en Odoo 19
             ``crm.crm_menu_root`` no tiene grupo propio.
POS          ``point_of_sale.group_pos_user``
Inventario   ``stock.group_stock_user``
Compras      ``purchase.group_purchase_user``
Website      ``website.group_website_designer`` (Editor and
             Designer: incluye edición de páginas y
             plantillas QWeb del sitio)
============ ================================================

Los cinco implican además ``base.group_user``, para que asignar un rol
convierta siempre al usuario en usuario interno.

Instalación
===========

#. El módulo es **opcional**. ``erpico_web_sidebar`` por sí solo se instala en
   cualquier base y funciona; los roles sólo hacen falta si se quiere repartir
   el acceso a las aplicaciones sin usar los grupos nativos.
#. Instale ``erpico_web_sidebar_roles`` (arrastra ``sale``, ``purchase``,
   ``stock``, ``point_of_sale`` y ``website``).
#. Asigne los roles en *Ajustes > Usuarios > [usuario]*, en la categoría
   **ERPICO**. Cada rol es una casilla propia, así que se pueden activar varios a
   la vez. No hace falta activar el modo desarrollador.

Notas de implementación
=======================

* **Un ``res.groups.privilege`` por rol.** El formulario de usuario de Odoo 19
  dibuja cada privilegio como un ``selection`` y guarda el conjunto completo con
  ``x2ManyCommands.set`` sobre ``group_ids``
  (``addons/web/static/src/webclient/res_user_group_ids_field/res_user_group_ids_field.js``,
  líneas 73-80 y 253-255). Los grupos de un mismo privilegio son excluyentes
  entre sí, así que los cinco roles en un único privilegio harían que sólo se
  pudiera activar uno. Con un privilegio por rol, cada fila es un interruptor.
* **No se reutiliza el privilegio nativo** (p. ej. el de Punto de Venta) por la
  misma razón: el rol quedaría como una alternativa más a *User* /
  *Administrator* en el mismo desplegable.
* **Sin ``noupdate``** para que los ``implied_ids`` se actualicen en cada
  upgrade, igual que hacen los grupos del core.
* **Los XMLID cambiaron de módulo.** Antes de la 1.1.0 de este addon los grupos
  vivían en ``erpico_web_sidebar``; ahora son
  ``erpico_web_sidebar_roles.group_*_erpico``. ``group_crm_erpico`` y
  ``group_pos_erpico``, etc. se renombraron: los dos grupos de CRM y Ventas se
  fusionaron en un único ``group_ventas_erpico`` (mismo nombre: "CRM y Ventas
  ERPICO"). Cualquier referencia a los XMLID anteriores hay que actualizarla.
* El sidebar filtra las entradas por permisos con ``menuService.getAll()``, así
  que **no** se tocan los menús nativos: dar de alta un rol no reescribe
  ``ir_ui_menu``.
