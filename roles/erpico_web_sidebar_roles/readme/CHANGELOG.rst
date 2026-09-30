.. changelog:: 19.0.1.2.0

    * Feat: ``security/product_menus.xml`` destapa los submenus de Producto que
      el sidebar usa para la entrada "Productos": ``stock.product_product_menu``
      (Variantes), ``sale.menu_product_pricelist_main`` (Listas de precios) y
      ``website_sale.menu_product_attribute_action`` (Atributos), sumando
      ``stock.group_stock_user`` al ``group_ids`` de cada uno. Mismo mecanismo que
      ``report_menus.xml``: se abre el menu puntual, no el grupo *manager*
    * Odoo 19 no expone **ningun** xmlid de menu en el modulo ``product``; los
      destinos de producto cuelgan de ``stock``/``sale``/``website_sale``. De ahi
      que Atributos vaya por la rama de ``website_sale``: la de
      ``stock.menu_attribute_action`` pasa por "Configuration" (gate
      ``stock.group_stock_manager``) y abrirla exponeria toda esa seccion
    * Categorias de producto **no** se incluyen: en el core toda su cadena cuelga
      de Configuration, en cualquiera de sus cuatro rutas (``stock``, ``sale``,
      ``purchase``, ``account``). Se decidio con el usuario omitirla en lugar de
      escalar privilegios; sigue disponible bajo Inventario > Configuracion para
      quien sea manager
    * Chore: ``seed_users.py`` agrega el usuario QA ``inv`` (solo rol Inventario
      ERPICO). Es el unico usuario QA con ``stock.group_stock_user`` y **sin**
      ``product.group_product_variant``, o sea el unico que distingue si
      ``product_menus.xml`` funciona o no; ``basic`` ya trae ese grupo por otras
      vias. Se restore el grupo de ``basic``, que el script dejaba en ``[]`` y que
      rompia los 122 menus y el rail de 9 items con los que esta calibrada la suite

.. changelog:: 19.0.1.1.0

    * Feat: ``security/report_menus.xml`` destapa el nodo "Reporting" de Ventas,
      Inventario, Compras y Ecommerce sumando el grupo **usuario** nativo al
      ``group_ids`` del menu nativo (``sale.menu_sale_report``,
      ``stock.menu_warehouse_report``, ``purchase.purchase_report_main`` y
      ``website_sale.menu_report_sales``). Deliberadamente **no** se implica el
      grupo *manager* en el rol: abrir un report no requiere ser manager, y
      hacerlo abriria tambien "Configuration" de cada app
    * Feat: ``website_sale`` entra en ``depends``; sin el, "Online Sales" quedaba
      gateado a ``sales_team.group_sale_manager``. Arrastra ``website_payment``,
      ``website_mail``, ``delivery``, ``digest``, ``portal_rating`` y ``html_builder``
    * Fix: ``purchase.purchase_report`` (la hoja de "Reporting" en Compras) se
      abre al grupo **usuario** ademas del padre. Sin esto el fix de Reportes era
      inerte en Compras: ``ir_ui_menu._visible_menu_ids`` aplica "remove all menus
      without children", y como ese nodo tiene una sola hoja —que el core gatea al
      manager— el usuario se quedaba sin hijos visibles y el nodo entero se podaba
      del payload (BUG-S-054)
    * Fix: los dos wizards de Reportes de POS ("Sales Details" y "Session
      Report") se acotan a ``point_of_sale.group_pos_manager`` con
      ``(6, 0, [...])``. Sus modelos no tienen ACL de lectura para
      ``group_pos_user``, asi que un usuario POS normal los veia y reventaba al
      abrirlos (bug del core, BUG-S-052)
    * Chore: ``stock.menu_valuation`` ("Locations") sin tocar; su definicion
      nativa ya lo condiciona a multi-ubicacion / tracking owner

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
