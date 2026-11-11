// 反链面板 tooltip 统一封装：基于思源 aria-label + b3-tooltips 机制
// 约束：单行短文案（≤12 字）

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
