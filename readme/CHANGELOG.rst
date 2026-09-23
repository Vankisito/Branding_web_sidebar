.. changelog:: 19.0.1.0.2

    * Fix: drawer cierra al navegar desde app/submenú (BUG-S-013)
    * Fix: hover rail sin race — cancela timer en hoverApp (BUG-S-014)
    * Fix: toggleDrawer() muerto eliminado (BUG-S-015)
    * Fix: listener MENUS:APP-CHANGED removido de setup (BUG-S-016)
    * QA: Fase 5 completa — CDP C1-C8 + C11/C12, matriz manual automatizada (cdp_matrix.js)
    * QA: regresión erpico_debranding ejecutada (BUG-S-017: fallos de entorno, el sidebar no rompe la suite)
    * Chore: bugs S-001…S-016 resueltos y documentados en Bugs.md / Bug-hunt Fase 5

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
