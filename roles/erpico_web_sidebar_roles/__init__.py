"""Hooks de instalación de ``erpico_web_sidebar_roles``.

El módulo no define modelos; su único código es la migración de los grupos
ERPICO que hasta la 1.2.0 vivían en ``erpico_web_sidebar`` (ver hooks.py).
"""

from .hooks import post_init_hook
