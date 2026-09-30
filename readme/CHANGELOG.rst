.. changelog:: 19.0.1.5.0

    * Feat: la entrada "Productos" del rail muestra sus submenus como items
      navegables. Antes la entrada existia pero salia **vacia**: apuntaba a
      ``stock.menu_product_variant_config_stock``, que es una hoja accionable sin
      hijos, y tanto el flyout como el drawer solo iteraban ``section.childrenTree``.
      Ahora cada submenu es su propia seccion y las dos plantillas caen a
      ``section.leaf`` cuando la seccion no trae arbol, asi que una hoja accionable
      se dibuja como item en vez de desaparecer. La entrada quedo con
      Productos, Variantes y Listas de precios; Atributos se agrega desde
      ``erpico_web_sidebar_roles`` (ver su changelog y D-41)
    * Fix: el texto de un submenu sale del ``name`` del menu del core, en el
      idioma del usuario, y no del ``label`` de la seccion. El ``label`` queda
      solo como clave de agrupacion

.. changelog:: 19.0.1.4.0

    * Fix: el drawer movil dibuja **todos** los niveles de menu, no uno. El
      flyout ya era recursivo desde 1.0 (D-13) pero el drawer no, asi que un grupo
      de segundo nivel —p.ej. "Reporting"— quedaba como un unico item que abria la
      primera hoja alcanzable y sus demas hijos eran inalcanzables. Nuevo template
      ``erpico_web_sidebar.DrawerMenu`` con el mismo criterio que ``FlyoutMenu``
      (hoja = sin ``childrenTree``, grupo = etiqueta + ``t-call`` recursivo) y
      sangria de 16px por nivel en SCSS. Sin cambios en JS: ``openItem`` ya sabia
      resolver. Ver BUG-S-053
    * Chore: los permisos de los submenus "Reporting" los aporta ahora
      ``erpico_web_sidebar_roles`` (ver su changelog y D-40); este modulo no toca
      ningun menu nativo

.. changelog:: 19.0.1.3.0

    * Feat: los grupos de permisos pasan al subaddon ``erpico_web_sidebar_roles``
      (``roles/erpico_web_sidebar_roles/`` dentro del repo, opcional, con sus propias
      dependencias sobre ``sale``/``purchase``/``stock``/``point_of_sale``/``website``).
      ``erpico_web_sidebar`` queda dependiendo solo de ``web`` y ya no se puede
      instalar en una base sin las apps destino. Al ser un modulo anidado, hay que
      anadir ``<addons>/erpico_web_sidebar/roles`` al ``--addons-path``
    * Feat: los grupos "… ERPICO" son asignables **sin modo desarrollador**. Cada rol
      tiene su propio ``res.groups.privilege`` dentro de una categoria "ERPICO": el
      formulario de usuario dibuja un privilegio como *selection*, asi que con un
      unico privilegio compartido solo se podria activar un rol a la vez
    * Feat: los grupos de CRM y Ventas se fusionan en ``group_ventas_erpico``
      ("CRM y Ventas ERPICO"), que mantiene el nombre visible y ahora implica
      ``sales_team.group_sale_salesman`` (el grupo con el que Odoo 19 gatea
      ``crm.crm_menu_root``). ``group_crm_erpico`` desaparece
    * Feat: el rail y el drawer exponen ``data-entry`` y ``data-xmlids`` para que la
      matriz de QA pueda comparar los permisos de cada usuario contra una fixture
      escrita a mano
    * Fix: el rail se vuelve a resolver cuando el servicio de menus de Odoo reemplaza
      su payload (evento ``MENUS:APP-CHANGED``, p. ej. al cambiar de empresa), en vez
      de quedarse con las entradas del primer arranque
    * Fix: fuera el flag ``drawerOpenPending`` y su listener, que dejaban el drawer
      en un estado inconsistente si el primer clic llegaba antes del montaje
    * Fix: se elimina el loop permanente de ``requestAnimationFrame``; el estado de
      fullscreen se lee directo de ``webclient`` cuando cambia la UI
    * Fix: el brand de la navbar no lleva ya ``o_active`` fijo (era siempre verdadero y
      por eso nunca se ocultaba)
    * Fix: todos los scripts de ``cdp/`` salen con codigo 1 cuando un check falla, para
      que un rojo en consola no se cuele como corrida verde
    * Chore: ``noupdate="1"`` fuera de los grupos, que hacia que cambiar un
      ``implied_id`` en un upgrade no se aplicara nunca

.. changelog:: 19.0.1.2.0

    * Feat: un grupo de permisos por módulo nativo (CRM, Ventas, POS, Compras,
      Inventario, Website). Cada grupo hereda del grupo "User" de su módulo
      (``implied_ids``), no del "Administrator", asi que el usuario ve el modulo
      y los submenus restringidos al Administrator le quedan ocultos sin tocar
      los menus de Odoo (p.ej. POS > Configuration)
    * Fix: no se cablean los grupos a ``ir.ui.menu.group_ids``. En Odoo 19
      ``<menuitem>`` declara permisos con el atributo ``groups="..."`` y el m2m
      ``group_ids`` es aditivo, asi que un ``(4, ref(...))`` sobre un menu
      nativo solo anade el grupo: no restringe nada y ensucia el editor de menus
      de todas las apps (BUG-S-035)
    * Chore: ``sales_team`` anadido a ``depends`` (los grupos de CRM y Ventas
      heredan de ``sales_team.group_sale_salesman``, que es el grupo con el que
      Odoo gatea ``crm.crm_menu_root`` y los menus de pedido de venta)
    * Chore: ``security/data.xml`` con ``noupdate="1"`` para no re-aplicar los
      grupos en cada upgrade

.. changelog:: 19.0.1.1.0

    * Feat: sidebar por entradas (NAV_MAP) con el orden pedido por el cliente
      (Inicio, CRM, Ventas, Ecommerce, POS, Inventario, Productos, Compras,
      Website, Marketing - Email/SMS); cada entrada declara xmlids candidatos y
      se oculta si el usuario no tiene permiso
    * Feat: home de ERPICO (client action `erpico_web_sidebar_home`) visible
      para todos los usuarios al entrar, con 2 tarjetas de acceso rapido
      (Dashboards, CRM) filtradas por permisos
    * Feat: Ventas resuelve `sale.menu_sale_order`/`sale.menu_sale_quotations`
      (el root de venta esta `active=False` en Odoo 19 y nunca llega a `getApps()`);
      Productos resuelve los menus de stock (`product` no define menus)
    * Feat: Marketing Email/SMS agrupado en un solo icono con dos secciones
      independientes (cada una se oculta si la app no esta accesible)
    * Feat: icono de marca `brand-productos`
    * Feat: tests hoot de la resolucion de entradas (`static/tests/nav_entries.test.js`);
      `nav_entries.js` se declara explicito en `web.assets_unit_tests` porque el bundle de
      tests no arrastra los assets de backend
    * Fix: el primer clic en el toggle del drawer ya no se pierde si ocurre antes
      de que el componente monte (BUG-S-030); el pedido queda pendiente y se
      aplica al montar
    * Chore: Contactos, Facturacion, Discuss, Calendario y Ajustes fuera del rail
      (solo panel "Todas las aplicaciones"); Ajustes sigue en el footer del drawer
    * Chore: drawer movil replica las entradas del rail, mitigando BUG-S-022
      (el panel "Todas las aplicaciones" sigue siendo de escritorio, `d-none d-lg-flex`)
    * Chore: `spreadsheet_dashboard` fuera de `depends`; la tarjeta Dashboards del home y la
      entrada del rail se filtran por presencia real del menu
    * Chore: QA runtime v1.1 completa (C13-C18) con 10/10 scripts CDP en verde
    * Chore: URL y credenciales de los scripts CDP salen de variables de entorno
      (`cdp/qa_config.js`); se eliminan las credenciales hardcodeadas (BUG-S-029)
    * Chore: `cdp/seed_users.py` crea/repara los usuarios de la matriz de permisos
      y `cdp/README.md` documenta variables, trampas de Odoo 19 y scripts
    * Chore: eliminado `views/webclient_templates.xml` (vacio y fuera de `data`)

.. changelog:: 19.0.1.0.3

    * Fix: sidebar colapsa debajo de botones del módulo tras acción fullscreen (BUG-S-034)
      — `_onUIUpdated` usa `webclient.state.fullscreen` como fuente de verdad en vez de
        `evt.detail` de `ACTION_MANAGER:UI-UPDATED`; `_syncFullscreen()` con `requestAnimationFrame`
        loop sincroniza continuamente; `z-index` elevado a `$zindex-fixed` para estar por encima
        de botones/dropdowns del action manager
    * Fix: topbar logo eliminado (existe en sidebar/drawer), texto "Mi espacio de trabajo" eliminado
    * Fix: fondo topbar = $erpico-obsidian (#0c112e) para cohesión con brandbook
    * Fix: reset de colores en systray/breadcrumbs/dropdowns para legibilidad sobre fondo obsidian
    * Fix: dropdown-toggle morado del core eliminado (transparent bg + chalk text)
    * Fix: .o_menu_sections .o_nav_entry fondo morado del core -> $erpico-obsidian (links de sección en navbar)
    * Fix: font-family unificado 'Outfit', 'Work Sans' en breadcrumbs y navbar; eliminada regla .o_erpico_heading muerta
    * Fix: .o_erpico_module_brand color cambiado de $erpico-horizon-strong (morbado) a $erpico-chalk (blanco) para consistencia brandbook
    * Chore: eliminadas reglas CSS muertas (.o_erpico_brand, .o_erpico_workspace_divider, .o_erpico_workspace_label)

.. changelog:: 19.0.1.0.2

    * Fix (crítico): crash WebClient en blanco — bilaender SectionsMenu sin t-set sections (BUG-S-024)
    * Fix: doble margen .o_content desfasaba contenido 60px (BUG-S-025)
    * Fix: highlight app activa dinámico tras navegación (BUG-S-026)
    * Fix: fullscreenHidden stale al navegar target="new" desde fullscreen (BUG-S-027)
    * Fix: flyout pegajoso tras apertura por teclado — modelo _pointerInFlyout (BUG-S-028)
    * Chore: auditoría runtime contra core Odoo 19 (SectionsMenu, breadcrumbs portal, getMenuAsTree, UI-UPDATED details)
    * Chore: navbar.js con header @odoo-module; CDP headless 'new' → true

    * Fix: drawer cierra al navegar desde app/submenú (BUG-S-013)
    * Fix: hover rail sin race — cancela timer en hoverApp (BUG-S-014)
    * Fix: toggleDrawer() muerto eliminado (BUG-S-015)
    * Fix: listener MENUS:APP-CHANGED removido de setup (BUG-S-016)
    * QA: Fase 5 completa — CDP C1-C8 + C11/C12, matriz manual automatizada (cdp_matrix.js)
    * QA: regresión erpico_debranding ejecutada (BUG-S-017: fallos de entorno, el sidebar no rompe la suite)
    * Chore: bugs S-001…S-016 resueltos y documentados en Bugs.md / Bug-hunt Fase 5
    * QA: Bug-hunt Fase 6 — detectados (sin fix, documentados en Bugs.md): S-019 (flyout cierra con mouse dentro),
      S-020 (tests CDP layout/smoke con viewport default 800px → falsa alarma / sin validar visibilidad),
      S-021 (gap 769-991px sin acceso a apps), S-022 (drawer móvil excluye otherApps)
    * QA: riesgos medios/bajos documentados en spec §9.1 (R-M1..R-M3, R-L1..R-L6)
    * Fix: flyout se cierra con mouse dentro — cancelación de timer en flyout enter (BUG-S-019)
    * Fix: topbar restaura contexto del módulo — brand, breadcrumbs, SectionsMenu (BUG-S-023 / D-28)
    * Chore: code audit + fixes menores (_hoverLock init, remove dead _onAppChanged, t-call for SectionsMenu)
    * Fix: breakpoints unificados — toggle visible <992px en vez de <768px, eliminando gap 769-991px sin navegación (BUG-S-021)
    * Fix: test infra CDP — viewport 1024×768 con setViewport en cdp_layout.js + cdp_smoke.js; rail visibilidad real con $$eval (BUG-S-020)
    * Docs: apuntes cliente anotados — BUG-S-023 (restaurar menú del módulo en topbar; D-28), spec §5.2a, Decisiones D-28

.. changelog:: 19.0.1.0.1

    * Feature: drawer móvil con backdrop, acordeón de apps, footer con SwitchCompanyMenu y botón Ajustes
    * Feature: landing admin → Dashboards nativo (gate por presencia de menú, sin hasGroup)
    * Feature: rail 12 apps mapeadas D-20 con iconos brand + sprite
    * Feature: flyout con submenús reales via menuService.getMenuAsTree().childrenTree
    * Fix: goToSettings() corregido — uso correcto de state.railApps/otherApps en lugar de getMenu() inexistente
    * Fix: Escape cierra drawer/flyout en fase capture para evitar conflictos con Odoo stopPropagation
    * Fix: fullscreen-hide con ACTION_MANAGER:UI-UPDATED listener
    * Fix: a11y — delay 180ms en clearHover, foco/teclado en rail items
    * Fix: _resolveLeaf() usa apps con _childrenTree pre-poblado
    * Fix: sidebar.scss con selectores amplios para margin-left (.o_main/.o_action_manager/.o_content)
    * Fix: _patch.js huérfano eliminado, manifest limpio
    * Chore: spec-web-sidebar-v1.md actualizada con D-20/D-23/D-24 confirmados runtime
    * Chore: Tests CDP y matriz manual documentados en TESTS_COVERAGE.md
