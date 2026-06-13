export interface TabSnapshot {
    timestamp: number;
    browser: "chrome" | "firefox" | "safari" | "edge" | "other";
    tabTitle: string;
}
export type TabUpdateCallback = (snapshot: TabSnapshot) => void;
export type PermissionCallback = (ok: boolean) => void;
export declare class TabReader {
    private intervalId;
    private lastTitle;
    private permissionOk;
    start(onTab: TabUpdateCallback, onPermission: PermissionCallback, pollMs?: number): void;
    stop(): void;
}
//# sourceMappingURL=tabReader.d.ts.map