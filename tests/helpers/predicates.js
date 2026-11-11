/**
 * 共享的依赖注入谓词 / 计数 lambda。
 *
 * 测试通过 deps 注入这些小函数以隔离被测模块；此前各测试文件内联逐字重复定义，
 * 现统一收敛到本文件。每个函数的语义与原先内联版本完全一致，替换时不得改变行为。
 */

/**
 * 计数累加：key 已存在时 +1，否则写入 initialValue（默认 1）。
 * 与 backlink-panel-data-collectors / collector-helpers 原内联实现逐字一致。
 */
export function updateMapCount(map, key, initialValue = 1) {
  return map.set(key, map.has(key) ? map.get(key) + 1 : initialValue);
}

/**
 * 直接写入（取最大值语义由生产代码负责比较）。
 * 与 collectors / collector-helpers 原内联实现逐字一致。
 */
export function updateMaxValueMap(map, key, value) {
  return map.set(key, value);
}

/**
 * 关键词匹配：includeText 全部包含且 excludeText 全部不包含。
 * 与 context-fragments / render-data / render-data-helpers 原内联实现逐字一致。
 */
export function matchKeywords(content, includeText, excludeText) {
  return (
    includeText.every((keyword) => content.includes(keyword)) &&
    excludeText.every((keyword) => !content.includes(keyword))
  );
}

/**
 * 空数组判断：null/undefined 或 length === 0 视为空。
 * 与 query-loaders / protyle-rendering 原内联实现逐字一致。
 */
export function isArrayEmpty(value) {
  return !value || value.length === 0;
}

/**
 * 非空数组判断。
 * 与 protyle-rendering 测试中真实实现（Array.isArray + length > 0）一致；
 * 其余测试仅以 no-op 桩形式出现（生产代码未消费）。
 */
export function isArrayNotEmpty(array) {
  return Array.isArray(array) && array.length > 0;
}

/**
 * 非空 Set 判断。
 * 与 render-data 测试及 protyle-rendering「真实实现」用例原内联实现一致。
 */
export function isSetNotEmpty(value) {
  return value && value.size > 0;
}

/**
 * 空 Set 判断，与 isSetNotEmpty 对偶。
 */
export function isSetEmpty(value) {
  return !value || value.size === 0;
}

/**
 * 非空字符串判断（仅排除空字符串）。
 * 与 query-loaders 原内联实现逐字一致。
 */
export function isStrNotBlank(value) {
  return value !== "";
}
