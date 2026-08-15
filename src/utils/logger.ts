import { SettingService } from "@/service/setting/SettingService";

export function isLogEnabled(): boolean {
    if (typeof globalThis !== "undefined" && (globalThis as any).__BACKLINK_DEBUG__ === true) {
        return true;
    }
    return SettingService.ins.SettingConfig?.enableLogPrint === true;
}

export function logInfo(...args: any[]) {
    if (isLogEnabled()) {
        console.log(...args);
    }
}

export function logWarn(...args: any[]) {
    if (isLogEnabled()) {
        console.warn(...args);
    }
}

export function logError(...args: any[]) {
    if (isLogEnabled()) {
        console.error(...args);
    }
}
