Usage
=====

1. Instale el módulo: ::

   odoo -d <db> -i erpico_web_sidebar

2. Recargue el backend.

El módulo **sólo depende de ``web``**: si en una base concreta no está instalado
alguno de los módulos destino (Dashboards, CRM, Ventas, POS, Ecommerce…), su
entrada simplemente no aparece. No hace falta instalar nada adicional para
instalar este módulo.

Los roles por módulo nativo viven en el subaddon
``erpico_web_sidebar_roles`` (``roles/erpico_web_sidebar_roles/`` dentro de este
repositorio), que es opcional y sí depende de ``sale``, ``purchase``, ``stock``,
``point_of_sale`` y ``website``. Odoo escanea el ``addons_path`` de un solo nivel,
así que hay que añadir el directorio ``roles`` al path:

.. code-block:: bash

    odoo --addons-path=<addons>,<addons>/erpico_web_sidebar/roles -d <db> -i erpico_web_sidebar_roles

Instalado, aparecen en el formulario de usuario, en una categoría propia
llamada **ERPICO**, con un rol por aplicación:

#. **CRM y Ventas ERPICO** — hereda de *User: Own Documents Only* de Ventas,
   que es el grupo que habilita también la raíz de CRM.
#. **POS ERPICO** — hereda de *User* de Punto de Venta.
#. **Inventario ERPICO** — hereda de *User* de Inventario.
#. **Compras ERPICO** — hereda de *User* de Compras.
#. **Website ERPICO** — hereda de *Editor and Designer* de Website, es decir
   permisos de editor sobre páginas y plantillas QWeb del sitio.

Cada rol es una casilla propia (no un desplegable excluyente), porque cada uno
tiene su propio privilegio: se pueden activar varios a la vez. No hace falta
modo desarrollador para asignarlos.

Comportamiento:

* La sidebar izquierda muestra 10 entradas, siempre en el mismo orden:

  #. Inicio (home de ERPICO)
  #. CRM
  #. Ventas
  #. Ecommerce
  #. Punto de venta
  #. Inventario
  #. Productos
  #. Compras
  #. Sitio web
  #. Marketing - Email/SMS

* **La sidebar se adapta a los permisos de cada usuario.** Una entrada sólo
  aparece si el usuario puede ver el menú correspondiente, así que un usuario
  sin ventas, sin punto de venta o sin inventario verá menos íconos (y nunca
  íconos vacíos). Lo mismo aplica a las tarjetas del Inicio y a los grupos de
  Marketing. Un cambio de permisos requiere recargar la página, o que el cliente
  refresque los menús: el rail se vuelve a resolver solo cuando el servicio de
  menús de Odoo reemplaza su payload.
* Al entrar, **todos los usuarios** aterrizan en la tarjeta *Inicio*, que
  ofrece acceso rápido a **Dashboards** y a **CRM** (si el usuario tiene acceso
  a ellas). Si el módulo no está disponible, se mantiene el comportamiento
  estándar de Odoo (primera aplicación).
* Al hacer clic en un ícono se abre su flyout con los submenús reales; los
  submenús se navegan con clic y con teclado, y el flyout se cierra solo al
  salir con el ratón o al pulsar ``Escape``.
* Botón "Todas las aplicaciones" (cuadrícula, en el pie del rail): lista
  **todas** las aplicaciones instaladas de Odoo, incluidas las que no están en
  la sidebar (Contactos, Facturación, Discuss, Calendario, Ajustes…), con su
  icono de marca cuando existe.
* En pantallas pequeñas el rail se oculta y sus entradas se muestran en un
  drawer que se abre desde el botón de la topbar. El drawer contiene los
  mismos elementos que el rail, incluidos los grupos de Marketing.
* Las entradas de Marketing - Email/SMS agrupan dos secciones: *Email
  Marketing* y *SMS Marketing*. Si el usuario no tiene acceso a SMS, esa
  sección no aparece.

Personalización:

* El orden, los íconos y las tarjetas del Inicio se definen en un único
  archivo: ``static/src/sidebar/nav_entries.js`` (``NAV_MAP`` y
  ``HOME_CARDS``). Para añadir una sección a un ícono, agregue su xmlid; para
  añadir una tarjeta de Inicio, agregue un objeto a ``HOME_CARDS``. No hace
  falta tocar el componente de la sidebar.
* Si cambia ``NAV_MAP``, actualice también ``cdp/expected_rail.js``: la matriz de
  QA compara el rail contra esa copia escrita a mano a propósito, para poder
  detectar un ``NAV_MAP`` mal escrito.
* Recordatorio: tras modificar archivos JS es necesario **reiniciar** el
  contenedor de Odoo para que se recompilen los assets.
