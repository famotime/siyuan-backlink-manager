/**
 * 组装反链数据拉取阶段结果：批量拉取反链数据，并按文档顺序挂载来源上下文窗口。
 * @param {Object} [options] 参数对象
 * @param {string} [options.rootId] 当前文档 ID
 * @param {Array<Object>} [options.pageBacklinkBlockArray] 当前页反链块节点数组
 * @param {Object} [options.deps] 依赖注入（便于单测替换真实实现）
 * @param {Function} [options.deps.getBatchBacklinkDoc] 批量获取反链数据（含 usedCache 标记）
 * @param {Function} [options.deps.loadOrderedBacklinkSourceWindowBlocks] 按文档真实顺序加载来源窗口块
 * @param {Function} [options.deps.attachBacklinkSourceWindows] 将来源窗口挂载到反链块节点
 * @returns {Promise<{rootId: string, backlinkDataArray: Array<Object>, usedCache: boolean}>}
 */
export async function buildBacklinkFetchStageResult({
  rootId,
  pageBacklinkBlockArray = [],
  deps = {},
} = {}) {
  const {
    getBatchBacklinkDoc,
    loadOrderedBacklinkSourceWindowBlocks,
    attachBacklinkSourceWindows,
  } = deps;

  const backlinkCacheData = await getBatchBacklinkDoc();
  const backlinkDataArray = backlinkCacheData.backlinks;
  const usedCache = backlinkCacheData.usedCache;

  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks(
    backlinkDataArray,
  );
  attachBacklinkSourceWindows({
    backlinkDataArray,
    backlinkBlockNodeArray: pageBacklinkBlockArray,
    orderedBlocksByRootId,
  });

  return {
    rootId,
    backlinkDataArray,
    usedCache,
  };
}
