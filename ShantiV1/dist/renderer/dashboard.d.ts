export {};
interface TabSnapshot {
    timestamp: number;
    browser: "chrome" | "firefox" | "safari" | "edge" | "other";
    tabTitle: string;
}
interface TabDashboardAPI {
    getTabs: () => Promise<TabSnapshot[]>;
    getPermission: () => Promise<boolean>;
    clearTabs: () => void;
    openAccessibilityPrefs: () => void;
    onTabsUpdate: (cb: (tabs: TabSnapshot[]) => void) => void;
    onTabsInit: (cb: (tabs: TabSnapshot[]) => void) => void;
    onPermissionStatus: (cb: (ok: boolean) => void) => void;
}
declare global {
    interface Window {
        tabDashboard: TabDashboardAPI;
    }
}
//# sourceMappingURL=dashboard.d.ts.map