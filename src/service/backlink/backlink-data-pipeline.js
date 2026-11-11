/**
 * 过滤、排序反链块节点，并应用上下文可见级别与预算约束。
 * @param {Object} [options] 参数对象
 * @param {Array<Object>} [options.backlinkBlockNodeArray] 待处理的反链块节点数组
 * @param {Object} [options.queryParams] 渲染查询参数（含排序方式、可见级别等）
 * @param {Object|null} [options.contextBudget] 上下文预算配置
 * @param {Object} [options.deps] 依赖注入（便于单测替换真实实现）
 * @param {Function} [options.deps.isBacklinkBlockValid] 校验反链块是否有效
 * @param {Function} [options.deps.backlinkBlockNodeArraySort] 反链块排序
 * @param {Function} [options.deps.applyBacklinkContextVisibilityToNodes] 应用上下文可见级别
 * @param {Function} [options.deps.applyBacklinkContextBudgetToNodes] 应用上下文预算
 * @returns {Array<Object>} 过滤排序后的反链块节点数组
 */
export function buildValidBacklinkRenderNodes({
  backlinkBlockNodeArray = [],
  queryParams,
  contextBudget = null,
  deps = {},
} = {}) {
  const {
    isBacklinkBlockValid,
    backlinkBlockNodeArraySort,
    applyBacklinkContextVisibilityToNodes,
    applyBacklinkContextBudgetToNodes,
  } = deps;

  const validBacklinkBlockNodeArray = [];
  for (const backlinkBlockNode of backlinkBlockNodeArray || []) {
    const valid = isBacklinkBlockValid?.(queryParams, backlinkBlockNode);
    if (!valid) {
      continue;
    }
    validBacklinkBlockNodeArray.push(backlinkBlockNode);
  }

  backlinkBlockNodeArraySort?.(
    validBacklinkBlockNodeArray,
    queryParams?.backlinkBlockSortMethod,
  );
  applyBacklinkContextVisibilityToNodes?.(
    validBacklinkBlockNodeArray,
    queryParams?.backlinkContextVisibilityLevel || "core",
  );
  applyBacklinkContextBudgetToNodes?.(
    validBacklinkBlockNodeArray,
    contextBudget,
  );

  return validBacklinkBlockNodeArray;
}

/**
 * 组装轻量化渲染数据结果对象。
 * @param {Object} [options] 参数对象
 * @param {string} [options.rootId] 当前文档 ID
 * @param {Array<Object>} [options.backlinkDataArray] 反链数据数组
 * @param {Object} [options.pagination] 分页信息（totalDocumentCount/pageNum/totalPage）
 * @param {Array<Object>|null} [options.validBacklinkBlockNodeArray] 过滤排序后的反链块节点数组
 * @param {Array<Object>|null} [options.filterBacklinkDocumentArray] 反链文档数组
 * @param {number} [options.pageSize] 每页数量
 * @param {boolean} [options.usedCache] 本次渲染是否命中缓存
 * @returns {Object} 渲染数据结果
 */
export function buildBacklinkPanelRenderDataResult({
  rootId = "",
  backlinkDataArray = [],
  pagination = {},
  validBacklinkBlockNodeArray = null,
  filterBacklinkDocumentArray = null,
  pageSize = 0,
  usedCache = false,
} = {}) {
  return {
    rootId,
    backlinkDataArray,
    backlinkDocumentCount: pagination?.totalDocumentCount,
    backlinkBlockNodeArray: validBacklinkBlockNodeArray,
    backlinkDocumentArray: filterBacklinkDocumentArray,
    pageNum: pagination?.pageNum,
    pageSize,
    totalPage: pagination?.totalPage,
    usedCache,
  };
}
