{
    "name": "ERPICO Web Sidebar Roles",
    "summary": "Roles ERPICO por módulo nativo para el sidebar web (Odoo 19)",
    "version": "19.0.1.2.0",
    "license": "LGPL-3",
    "author": "Habitat Digital",
    "website": "https://github.com/Vankisito/Branding_web_sidebar",
    "category": "Extra Tools",
    # website_sale se agrega en 1.1.0: `website_sale.menu_report_sales` (Online
    # Sales) sólo existe si website_sale está instalado, y cuelga de
    # `website.menu_reporting`, que ya es visible para base.group_user. Sin esta
    # dependencia el reporte quedaba gateado a sales_team.group_sale_manager.
    "depends": [
        "sale",
        "sales_team",
        "purchase",
        "stock",
        "point_of_sale",
        "website",
        "website_sale",
    ],
    "data": [
        "security/data.xml",
        "security/report_menus.xml",
        "security/product_menus.xml",
    ],
    # Migra los grupos ERPICO que dejaba la 1.2.0 de erpico_web_sidebar.
    "post_init_hook": "post_init_hook",
    "installable": True,
    "application": False,
    "auto_install": False,
}
