"""Migración de los grupos ERPICO de la 1.2.0 de ``erpico_web_sidebar``.

Hasta la 1.2.0 los grupos ERPICO se declaraban en ``erpico_web_sidebar``. En la
1.3.0 ese módulo ya no carga ``security/data.xml`` (los roles viven en este
módulo hermano), pero Odoo **no borra** los registros que desaparecen de un
fichero de datos: los 6 grupos antiguos siguen en la base, sin `privilege_id` y
sin usuarios migrados. Peor: un usuario que tuviera asignado el grupo viejo
seguiría con el acceso por la vía vieja, y el rol nuevo aparecería sin asignar a
nadie.

Este hook corre en la instalación de este módulo (los hooks de post_init sólo se
ejecutan al instalar, y este módulo es nuevo, que es justo cuando hace falta) y:

1. pasa los usuarios de cada grupo viejo al grupo nuevo equivalente;
2. borra los grupos viejos y sus XMLID, que ya no declara ningún módulo.

Es idempotente: si no encuentra XMLID viejos no hace nada. Si encuentra un grupo
viejo que sigue referenciado desde un menú nativo, no lo borra (lo avisa) para no
romper menús; en ese caso sólo migra los usuarios.
"""

import logging

_logger = logging.getLogger(__name__)

OLD_MODULE = "erpico_web_sidebar"
NEW_MODULE = "erpico_web_sidebar_roles"

# XMLID viejo (sin módulo) -> XMLID nuevo. Los dos grupos de CRM y Ventas se
# fusionan en `group_ventas_erpico` (decisión del cliente: en Odoo 19 el root de
# CRM está gateado por sales_team.group_sale_salesman, así que no se pueden
# separar, ver BUG-S-040).
_OLD_TO_NEW = {
    "group_crm_erpico": "group_ventas_erpico",
    "group_ventas_erpico": "group_ventas_erpico",
    "group_pos_erpico": "group_pos_erpico",
    "group_inventario_erpico": "group_inventario_erpico",
    "group_compras_erpico": "group_compras_erpico",
    "group_website_erpico": "group_website_erpico",
}


def _old_groups(env):
    """[(nombre_xmlid_viejo, grupo_viejo)] de los grupos ERPICO de la 1.2.0."""
    data = env["ir.model.data"].sudo().search([
        ("model", "=", "res.groups"),
        ("module", "=", OLD_MODULE),
        ("name", "in", list(_OLD_TO_NEW)),
    ])
    Groups = env["res.groups"].sudo()
    out = []
    for record in data:
        group = Groups.browse(record.res_id).exists()
        if group:
            out.append((record.name, group))
    return out


def post_init_hook(env):
    old_groups = _old_groups(env)
    if not old_groups:
        return

    Users = env["res.users"].sudo()
    _logger.info("erpico_web_sidebar_roles: migrando %s grupo(s) ERPICO de %s", len(old_groups), OLD_MODULE)
    for old_name, old_group in old_groups:
        new_group = env.ref(
            "%s.%s" % (NEW_MODULE, _OLD_TO_NEW[old_name]), raise_if_not_found=False
        )
        if not new_group:
            _logger.warning(
                "erpico_web_sidebar_roles: no existe %s.%s; no se migra %s",
                NEW_MODULE, _OLD_TO_NEW[old_name], old_name,
            )
            continue
        users = Users.search([("group_ids", "in", old_group.ids)])
        if users:
            # (4, id) por usuario: se suma el rol nuevo sin tocar el resto de sus
            # grupos. (6, ...) borraría Role/Administrator y rompería el usuario.
            for user in users:
                user.write({"group_ids": [(4, new_group.id)]})
            _logger.info(
                "erpico_web_sidebar_roles: %d usuario(s) de %s -> %s",
                len(users), old_group.name, new_group.name,
            )
        # No borrar si el core o un addon lo referencia: BUG-S-035 dejó los
        # menús nativos sin tocar, pero un third-party podría haberlos usado.
        menu_count = env["ir.ui.menu"].sudo().search_count([("group_ids", "in", old_group.ids)])
        if menu_count:
            _logger.warning(
                "erpico_web_sidebar_roles: %s sigue en %d menu(s); NO se borra (solo se migraron los usuarios)",
                old_group.name, menu_count,
            )
            continue
        old_name_for_log = old_group.name
        old_group.unlink()
        _logger.info("erpico_web_sidebar_roles: grupo obsoleto %s borrado", old_name_for_log)
