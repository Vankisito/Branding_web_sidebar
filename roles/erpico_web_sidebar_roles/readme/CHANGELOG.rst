.. changelog:: 19.0.1.0.0

    * Feat: modulo inicial con cinco roles por aplicacion, cada uno en su propio
      ``res.groups.privilege`` dentro de una categoria "ERPICO" para que el
      formulario de usuario los muestre como casillas independientes y no como
      un desplegable excluyente
    * Feat: ``group_ventas_erpico`` ("CRM y Ventas ERPICO") implica
      ``sales_team.group_sale_salesman``, que es el grupo con el que Odoo 19
      gatea la raiz de CRM
    * Chore: grupos movidos desde ``erpico_web_sidebar``; los XMLID ahora son
      ``erpico_web_sidebar_roles.group_*_erpico`` y ``group_crm_erpico`` se
      fusiono en ``group_ventas_erpico``
