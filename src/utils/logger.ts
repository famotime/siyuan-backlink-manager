// 日志开关通过 globalThis.__BACKLINK_DEBUG__ 全局标志控制，
// 由 SettingService 在初始化与配置更新时同步（见 syncDebugFlag）。
// 不再直接 import SettingService，避免 utils ↔ service 的循环依赖。

export function isLogEnabled(): boolean {
    if (typeof globalThis !== "undefined" && (globalThis as any).__BACKLINK_DEBUG__ === true) {
        return true;
    }
    return false;
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
