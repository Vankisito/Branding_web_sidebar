{
    "name": "ERPICO Web Sidebar Roles",
    "summary": "Roles ERPICO por módulo nativo para el sidebar web (Odoo 19)",
    "version": "19.0.1.0.0",
    "license": "LGPL-3",
    "author": "Habitat Digital",
    "website": "https://github.com/Vankisito/Branding_web_sidebar",
    "category": "Extra Tools",
    "depends": [
        "sale",
        "sales_team",
        "purchase",
        "stock",
        "point_of_sale",
        "website",
    ],
    "data": [
        "security/data.xml",
    ],
    # Migra los grupos ERPICO que dejaba la 1.2.0 de erpico_web_sidebar.
    "post_init_hook": "post_init_hook",
    "installable": True,
    "application": False,
    "auto_install": False,
}
