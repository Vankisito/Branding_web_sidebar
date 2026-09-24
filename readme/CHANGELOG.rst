.. changelog:: 19.0.1.0.3

    * Fix: topbar logo eliminado (existe en sidebar/drawer), texto "Mi espacio de trabajo" eliminado
    * Fix: fondo topbar = $erpico-obsidian (#0c112e) para cohesión con brandbook
    * Fix: reset de colores en systray/breadcrumbs/dropdowns para legibilidad sobre fondo obsidian
    * Fix: font-family unificado 'Outfit', 'Work Sans' en breadcrumbs y navbar; eliminada regla .o_erpico_heading muerta
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
