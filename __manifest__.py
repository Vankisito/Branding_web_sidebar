{
    "name": "ERPICO Web Sidebar",
    "summary": "Tiendanube-style sidebar navigation, home and minimal topbar for Odoo 19",
    "version": "19.0.1.5.0",
    "license": "LGPL-3",
    "author": "Habitat Digital",
    "website": "https://github.com/Vankisito/Branding_web_sidebar",
    "category": "Productivity",
    # Unica dependencia: el rail se filtra por permisos con menuService.getAll(),
    # asi que en una base sin apps de negocio instala y simplemente no muestra
    # entradas. Los roles ERPICO viven en el subaddon roles/erpico_web_sidebar_roles
    # de este mismo repo, que si depende de los modulos nativos.
    "depends": [
        "web",
    ],
    "data": [
        "views/home.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "erpico_web_sidebar/static/src/sidebar/sidebar.scss",
            "erpico_web_sidebar/static/src/sidebar/nav_entries.js",
            "erpico_web_sidebar/static/src/sidebar/home.scss",
            "erpico_web_sidebar/static/src/sidebar/navbar.js",
            "erpico_web_sidebar/static/src/sidebar/navbar.xml",
            "erpico_web_sidebar/static/src/sidebar/sidebar.js",
            "erpico_web_sidebar/static/src/sidebar/sidebar.xml",
            "erpico_web_sidebar/static/src/sidebar/home.js",
            "erpico_web_sidebar/static/src/sidebar/home.xml",
            "erpico_web_sidebar/static/src/sidebar/landing_patch.js",
        ],
        "web.assets_unit_tests": [
            # El fuente debe ir en el bundle de tests: el runner no arrastra los
            # assets de backend y sin esto Hoot falla con "modules needed by
            # other modules but have not been defined".
            "erpico_web_sidebar/static/src/sidebar/nav_entries.js",
            "erpico_web_sidebar/static/tests/**/*.test.js",
        ],
    },
    "demo": [],
    "installable": True,
    "application": False,
    "auto_install": False,
}
