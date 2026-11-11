import {
  buildTreeOrderedBlocks,
  compareBlocksByDocumentOrder,
  getKramdownOrderMapByRootId,
  getSiblingOrderMapByParentId,
  hasCompleteDocumentOrder,
} from "./backlink-source-window-ordering.js";

function buildSourceWindowRootIds(backlinkDataArray = []) {
  const rootIdSet = new Set();
  for (const backlinkData of backlinkDataArray) {
    const rootId = backlinkData?.backlinkBlock?.root_id;
    if (rootId) {
      rootIdSet.add(rootId);
    }
  }
  return Array.from(rootIdSet);
}

export function generateBacklinkSourceWindowBlockArraySql(rootIdArray = []) {
  if (!Array.isArray(rootIdArray) || rootIdArray.length <= 0) {
    return "";
  }

  const rootIdListSql = rootIdArray.map((rootId) => `'${rootId}'`).join(", ");
  return `SELECT * FROM blocks WHERE root_id IN (${rootIdListSql}) AND type != 'd' LIMIT 999999999;`;
}

/**
 * 按文档真实顺序加载来源窗口所需的所有文档块：
 * 优先使用块索引（文档序），索引缺失的文档回退到 kramdown + 兄弟层级排序。
 * @param {Object} [options] 参数对象
 * @param {Array<Object>} [options.backlinkDataArray] 反链数据数组
 * @param {Object} [options.deps] 依赖注入（便于单测替换真实实现）
 * @param {Function} [options.deps.queryDocumentBlocksByRootIds] 按 rootId 批量查询文档块
 * @param {Function} [options.deps.getBlockIndexMap] 批量获取块在文档中的索引
 * @param {Function} [options.deps.getChildBlocks] 查询子块
 * @param {Function} [options.deps.getBlockKramdown] 查询块 kramdown 源码
 * @returns {Promise<Map<string, Array<Object>>>} rootId -> 已按文档顺序排序的块数组
 */
export async function loadOrderedBacklinkSourceWindowBlocks({
  backlinkDataArray = [],
  deps = {},
} = {}) {
  const {
    queryDocumentBlocksByRootIds,
    getBlockIndexMap,
    getChildBlocks,
    getBlockKramdown,
  } = deps;
  const rootIdArray = buildSourceWindowRootIds(backlinkDataArray);
  if (
    rootIdArray.length <= 0 ||
    typeof queryDocumentBlocksByRootIds !== "function"
  ) {
    return new Map();
  }

  const documentBlockArray =
    (await queryDocumentBlocksByRootIds(rootIdArray)) || [];
  if (!Array.isArray(documentBlockArray) || documentBlockArray.length <= 0) {
    return new Map();
  }

  const indexMap =
    typeof getBlockIndexMap === "function"
      ? await getBlockIndexMap(documentBlockArray.map((block) => block.id))
      : new Map();
  const orderedBlocksByRootId = new Map();

  for (const block of documentBlockArray) {
    const rootId = block?.root_id;
    if (!rootId) {
      continue;
    }

    let blockArray = orderedBlocksByRootId.get(rootId);
    if (!blockArray) {
      blockArray = [];
      orderedBlocksByRootId.set(rootId, blockArray);
    }
    blockArray.push(block);
  }

  // 文档序完整性只计算一次，避免同一份数据在筛选与排序两个阶段重复扫描
  const completeOrderMapByRootId = new Map();
  for (const [rootId, blockArray] of orderedBlocksByRootId.entries()) {
    completeOrderMapByRootId.set(rootId, hasCompleteDocumentOrder(blockArray, indexMap));
  }
  const incompleteRootIdArray = Array.from(completeOrderMapByRootId.entries())
    .filter(([, hasComplete]) => !hasComplete)
    .map(([rootId]) => rootId);
  const kramdownOrderMapByRootId = await getKramdownOrderMapByRootId(
    incompleteRootIdArray,
    { getBlockKramdown },
  );

  for (const [rootId, blockArray] of orderedBlocksByRootId.entries()) {
    if (completeOrderMapByRootId.get(rootId)) {
      blockArray.forEach((block) => {
        block.__backlinkSourceDocumentOrder = indexMap.get(block.id);
      });
      blockArray.sort((blockA, blockB) =>
        compareBlocksByDocumentOrder(blockA, blockB, indexMap),
      );
      continue;
    }

    const kramdownOrderMap = kramdownOrderMapByRootId.get(rootId) || new Map();
    const fallbackIndexMap = new Map();
    for (const block of blockArray) {
      const explicitIndex = indexMap.get(block.id);
      if (Number.isFinite(explicitIndex)) {
        fallbackIndexMap.set(block.id, explicitIndex);
        continue;
      }
      const kramdownIndex = kramdownOrderMap.get(block.id);
      if (Number.isFinite(kramdownIndex)) {
        fallbackIndexMap.set(block.id, kramdownIndex);
      }
    }

    const siblingOrderMapByParentId = await getSiblingOrderMapByParentId(blockArray, {
      getChildBlocks,
    });
    const orderedBlocks = buildTreeOrderedBlocks(
      blockArray,
      rootId,
      fallbackIndexMap,
      siblingOrderMapByParentId,
    );
    orderedBlocks.forEach((block, order) => {
      block.__backlinkSourceDocumentOrder = order;
    });
    blockArray.length = 0;
    blockArray.push(...orderedBlocks);
  }

  return orderedBlocksByRootId;
}
