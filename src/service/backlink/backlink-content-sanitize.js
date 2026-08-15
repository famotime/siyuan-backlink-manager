// 反链渲染内容清洗与时间格式化纯函数
// 背景：内核 getBacklinkDoc 返回的 dom/markdown 中会混入 HTML 注释节点
// （如 <!-- network-lens-wiki-section:intro -->）与未格式化的 ISO 时间戳，
// 直接渲染会暴露给最终用户，这里在渲染数据管线统一清洗。

// ISO 8601 时间戳（带 T 分隔，允许小数秒与时区后缀）
const ISO_DATETIME_PATTERN =
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/**
 * 将 ISO 时间戳格式化为本地时间 `YYYY-MM-DD HH:mm`（秒与毫秒省略）
 * @param {string} isoDateTime ISO 8601 时间字符串
 * @returns {string} 格式化后的本地时间；无法解析时原样返回入参
 */
export function formatBacklinkDateTime(isoDateTime) {
    const raw = String(isoDateTime ?? "").trim();
    if (!raw) {
        return "";
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return raw;
    }
    const pad = (value) => String(value).padStart(2, "0");
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/**
 * 清洗反链渲染内容：
 * 1. 剥离 HTML 注释节点；
 * 2. 将文本中的 ISO 时间戳格式化为本地 `YYYY-MM-DD HH:mm`；
 * 3. 压缩连续空行（最多保留一个空行）。
 * @param {string} content 待清洗的 HTML/markdown 内容
 * @returns {string} 清洗后的内容
 */
export function sanitizeBacklinkContent(content = "") {
    let result = String(content ?? "");
    if (!result) {
        return "";
    }

    // 1. 剥离 HTML 注释节点（含跨行注释）
    result = result.replace(/<!--[\s\S]*?-->/g, "");

    // 2. 格式化内联 ISO 时间戳为本地时间
    result = result.replace(ISO_DATETIME_PATTERN, (match) =>
        formatBacklinkDateTime(match),
    );

    // 3. 压缩连续空行：两个及以上换行合并为一个空行
    result = result.replace(/\n[ \t]*(\r?\n[ \t]*)+/g, "\n\n");

    return result.trim();
}
