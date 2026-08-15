// 反链面板线框图标统一渲染入口
// 一处定义图标 class 与尺寸，消灭面板内内联 SVG path 的重复复制。
// 图标 symbol 全部注册于 src/models/icon-constant.ts 的 CUSTOM_ICON_MAP。

// 默认尺寸走设计 token（src/styles/tokens.scss 中的 --bl-icon-size）
export const DEFAULT_BACKLINK_ICON_SIZE = "var(--bl-icon-size)";

/**
 * 渲染面板线框图标
 * @param iconId CUSTOM_ICON_MAP 中的 symbol id（不带 # 前缀）
 * @param size 图标尺寸，数字按 px 处理；默认引用 --bl-icon-size token
 * @returns 可直接插入 HTML 的 svg 字符串
 */
export function renderIcon(
    iconId: string,
    size: number | string = DEFAULT_BACKLINK_ICON_SIZE,
): string {
    const sizeValue = typeof size === "number" ? `${size}px` : size;
    return `<svg class="bl-icon" width="${sizeValue}" height="${sizeValue}" style="fill:none!important;" aria-hidden="true"><use xlink:href="#${iconId}"></use></svg>`;
}
