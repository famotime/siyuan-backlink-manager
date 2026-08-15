// 反链面板 tooltip 统一封装：基于思源 aria-label + b3-tooltips 机制
// 约束：单行短文案（≤12 字）；方向按宿主可配（Dock 窄栏 __sw，宽场景 __s）

export type BacklinkTooltipHostKind = "dock" | "tab" | "bottom" | string;

/**
 * 按宿主类型解析 tooltip 弹出方向
 * @param hostKind 宿主类型：dock（窄栏）/ tab（独立页签）/ bottom（文档底部）
 * @returns b3-tooltips 方向后缀
 */
export function getBacklinkTooltipDirection(
    hostKind: BacklinkTooltipHostKind = "dock",
): string {
    return hostKind === "dock" ? "sw" : "s";
}

/**
 * 生成 tooltip class 组合
 * @param hostKind 宿主类型，默认 dock
 */
export function buildBacklinkTooltipClass(
    hostKind: BacklinkTooltipHostKind = "dock",
): string {
    return `b3-tooltips b3-tooltips__${getBacklinkTooltipDirection(hostKind)}`;
}

/**
 * 由分页进度文本（如 "2/3"）生成完整语义 tooltip
 * @param progressText 进度文本，格式 "当前/总数"
 * @returns "第 X 条 / 共 N 条反链"；无法解析时返回空串
 */
export function buildBacklinkProgressTooltip(progressText = ""): string {
    const match = /(\d+)\s*\/\s*(\d+)/.exec(String(progressText || ""));
    if (!match) {
        return "";
    }
    return `第 ${match[1]} 条 / 共 ${match[2]} 条反链`;
}
