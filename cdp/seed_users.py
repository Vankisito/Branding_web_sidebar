"""
Crea/repara los usuarios que usa cdp/cdp_matrix.js.

Uso (desde el host, con el stack QA levantado):

    Get-Content cdp/seed_users.py -Raw | docker exec -i odoo_sidebar_test odoo shell -d sidebar_test --no-http --log-level=error --db_host=db_sidebar_test --db_user=odoo --db_password=odoo
    docker restart odoo_sidebar_test

Idempotente: si el usuario ya existe, sólo reescribe nombre, grupos y contraseña.

Los grupos "… ERPICO" (CRM y Ventas/POS/Inventario/Compras/Website) los crea el
subaddon `erpico_web_sidebar_roles` (roles/erpico_web_sidebar_roles/), que es
quien declara sus dependencias sobre sale/purchase/stock/point_of_sale/website. Cada uno implica el grupo "User"
del módulo nativo correspondiente, así que con pertenecer al rol ya le llega el
menú desde el core y el sidebar lo muestra. Si el módulo de roles no está
instalado, este script avisa y deja a los usuarios con `base.group_user` solamente.

Los roles se resuelven por XMLID (`erpico_web_sidebar_roles.group_*_erpico`) y no
por nombre, para no depender del idioma de la instalación.

Passwords: los mismos defaults que cdp/qa_config.js. Override con
ODOO_PASS_VENTAS / ODOO_PASS_BASIC.
"""

import os

BASE_GROUP = env.ref("base.group_user")
ROLES_MODULE = "erpico_web_sidebar_roles"
Groups = env["res.groups"]

ROLE_XMLIDS = {
    "CRM y Ventas ERPICO": "%s.group_ventas_erpico" % ROLES_MODULE,
    "POS ERPICO": "%s.group_pos_erpico" % ROLES_MODULE,
    "Inventario ERPICO": "%s.group_inventario_erpico" % ROLES_MODULE,
    "Compras ERPICO": "%s.group_compras_erpico" % ROLES_MODULE,
    "Website ERPICO": "%s.group_website_erpico" % ROLES_MODULE,
}

ROLES_STATE = env["ir.module.module"].search(
    [("name", "=", ROLES_MODULE)], limit=1
).state or "no instalado"
ROLES_INSTALLED = ROLES_STATE == "installed"
if not ROLES_INSTALLED:
    print("AVISO: el modulo %s no esta instalado (%s); los roles ERPICO no se asignan."
          % (ROLES_MODULE, ROLES_STATE))
else:
    print("Modulo de roles: %s (%s)" % (ROLES_MODULE, ROLES_STATE))


def role(name):
    """XMLID del rol ERPICO. Devuelve None si el modulo de roles no esta."""
    if not ROLES_INSTALLED:
        return None
    group = env.ref(ROLE_XMLIDS[name], raise_if_not_found=False)
    if not group:
        print("AVISO: falta el grupo %s; revisa la instalacion de %s." % (ROLE_XMLIDS[name], ROLES_MODULE))
    return group


# (login, nombre, grupos extra sobre base.group_user)
# `inv` existe para los submenus de Producto: es el unico usuario QA con
# stock.group_stock_user y SIN product.group_product_variant ni
# product.group_product_pricelist, que es justo el caso que depende de
# security/product_menus.xml. `basic` NO sirve para eso: tiene los tres grupos.
QA_USERS = [
    ("ventas", "Usuario Ventas", ["sales_team.group_sale_salesman", "CRM y Ventas ERPICO"]),
    # `basic` es el usuario "todas las apps de usuario, ningun manager". Este es
    # el baseline con el que se calibraron los 122 menus, el rail de 9 items y las
    # expectativas de check_report_menus.js; dejarlo en [] lo reduce a usuario
    # interno pelado y rompe las tres cosas.
    ("basic", "Usuario Basico", [
        "sales_team.group_sale_salesman",
        "stock.group_stock_user",
        "purchase.group_purchase_user",
        "point_of_sale.group_pos_user",
    ]),
    ("inv", "Usuario Inventario", ["Inventario ERPICO"]),
]
ADMIN_ERPICO = list(ROLE_XMLIDS.keys())


def password_for(login):
    """Mismos defaults que cdp/qa_config.js."""
    if login == "admin":
        return os.environ.get("ODOO_PASSWORD") or "admin"
    if login == "ventas":
        return os.environ.get("ODOO_PASS_VENTAS") or os.environ.get("ODOO_PASSWORD") or "ventas"
    # default: el login mismo (admin/admin, ventas/ventas, basic/basic, inv/inv)
    return os.environ.get("ODOO_PASSWORD") or login


Users = env["res.users"]
crypt_ctx = Users._crypt_context()


def resolve(spec):
    """'base.group_user' -> xmlid;  'CRM y Ventas ERPICO' -> rol del modulo de roles."""
    if spec in ROLE_XMLIDS:
        return role(spec)
    return env.ref(spec)


ROLES = [(login, name, extra, False) for login, name, extra in QA_USERS]
# admin: se le AGREGAN los roles ERPICO; nunca se reemplazan los suyos (si no,
# pierde Role / Administrator y Odoo rechaza el save).
ROLES.append(("admin", "Mitchell Admin", ADMIN_ERPICO, True))
for login, name, extra, merge in ROLES:
    groups = [BASE_GROUP] + [g for g in (resolve(x) for x in extra) if g]
    user = Users.search([("login", "=", login)], limit=1)
    if user:
        if merge:
            # unión con los grupos actuales: admin conserva Role / Administrator
            kept = list(user.group_ids)
            groups = kept + [g for g in groups if g not in kept]
        user.write({"name": name, "group_ids": [(6, 0, [g.id for g in groups])], "active": True})
        action = "actualizado"
    else:
        user = Users.create({
            "login": login,
            "name": name,
            "group_ids": [(6, 0, [g.id for g in groups])],
        })
        action = "creado"
    user._set_encrypted_password(user.id, crypt_ctx.hash(password_for(login)))
    print("%-8s uid=%-3s %s | grupos: %s" % (
        login, user.id, action, ", ".join(sorted(user.group_ids.mapped("name")))))

env.cr.commit()
print("commit OK (los uids esperados en cdp_matrix son admin=2, ventas=17, basic=18)")
