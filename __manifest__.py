{
    "name": "ERPICO Web Sidebar",
    "summary": "Tiendanube-style sidebar navigation and minimal topbar for Odoo 19",
    "version": "19.0.1.0.3",
    "license": "LGPL-3",
    "author": "Habitat Digital",
    "website": "https://github.com/Vankisito/Branding_web_sidebar",
    "category": "Productivity",
    "depends": [
        "web",
        "spreadsheet_dashboard",
    ],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "erpico_web_sidebar/static/src/sidebar/sidebar.scss",
            "erpico_web_sidebar/static/src/sidebar/navbar.js",
            "erpico_web_sidebar/static/src/sidebar/navbar.xml",
            "erpico_web_sidebar/static/src/sidebar/sidebar.js",
            "erpico_web_sidebar/static/src/sidebar/sidebar.xml",
            "erpico_web_sidebar/static/src/sidebar/landing_patch.js",
        ],
    },
    "demo": [],
    "installable": True,
    "application": False,
    "auto_install": False,
}
