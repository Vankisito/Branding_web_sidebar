{
    'name': 'ERPICO Web Sidebar',
    'version': '19.0.1.0.0',
    'category': 'Productivity',
    'summary': 'Tiendanube-style sidebar navigation and minimal topbar for Odoo 19',
    'description': """
Navegación tipo Tiendanube para el backend de Odoo 19:

- Sidebar izquierda (rail) con iconos de app de la marca ERPICO.
- Flyout con submenús reales de cada aplicación al hover/clic.
- Topbar mínima: brand ERPICO + systray completo de Odoo.
- Landing del administrador en la app "Dashboards" de Odoo.
- Drawer móvil con acordeón de aplicaciones y backdrop.

Todos los cambios se aplican por herencia de template, registry
(`main_components`) y patch de WebClient (OCA); nunca se modifica el código
del seed, y todo es revertible con `-u`.
    """,
    'author': 'Habitat Digital',
    'website': 'https://github.com/Vankisito/Branding_web_sidebar',
    'license': 'LGPL-3',
    'depends': [
        'web',
    ],
    'data': [],
    'assets': {
        'web.assets_backend': [
            'erpico_web_sidebar/static/src/sidebar/sidebar.scss',
            'erpico_web_sidebar/static/src/sidebar/navbar.js',
            'erpico_web_sidebar/static/src/sidebar/navbar.xml',
            'erpico_web_sidebar/static/src/sidebar/sidebar.js',
            'erpico_web_sidebar/static/src/sidebar/sidebar.xml',
            'erpico_web_sidebar/static/src/sidebar/landing_patch.js',
        ],
    },
    'demo': [],
    'installable': True,
    'application': False,
    'auto_install': False,
}