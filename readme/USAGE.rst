Usage
=====

1. Instale el módulo: ::

   odoo -d <db> -i erpico_web_sidebar

2. Recargue el backend.

Comportamiento:

* Todos los usuarios ven la sidebar izquierda y la topbar mínima.
* Solo el administrador aterriza en la app "Dashboards" al entrar.
* Los usuarios sin acceso a tableros aterrizan en su primera aplicación
  (comportamiento estándar de Odoo).
* En pantallas pequeñas (<= 768px) la sidebar se convierte en un drawer que
  se abre desde el botón de la topbar.

Botón "Todas las aplicaciones" (cuadrícula, en el rail): lista todas las
aplicaciones instaladas de Odoo, incluso las que no tienen icono de marca.