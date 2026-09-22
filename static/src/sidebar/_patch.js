import { patch } from "@web/core/utils/patch";

const _loadDefaultAppOriginal = WebClient.prototype._loadDefaultApp;

WebClient.prototype._loadDefaultApp = async function () {
    // Check if the current user is admin (has the base group system)
    const isAdmin =
        this.env.services.user?.hasGroup?.call(this.env.services.user, "base.group_system") ||
        false;

    if (isAdmin) {
        // Find the Dashboard app by its xmlid
        const dashApps = this.menuService.getApps().filter(
            (app) => app.xmlid === "spreadsheet_dashboard.spreadsheet_dashboard_menu_root"
        );
        if (dashApps.length > 0) {
            await this.menuService.selectMenu(dashApps[0]);
            return dashApps[0];
        }
    }

    // Fall back to the original behavior for non-admin users
    return _loadDefaultAppOriginal.call(this);
};