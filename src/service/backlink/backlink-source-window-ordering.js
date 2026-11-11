function getBlockSortValue(block = {}) {
  const sortValue = Number(block?.sort ?? 0);
  return Number.isFinite(sortValue) ? sortValue : 0;
}

export function compareBlocksByFallbackOrder(blockA = {}, blockB = {}) {
  const sortResult = getBlockSortValue(blockA) - getBlockSortValue(blockB);
  if (sortResult !== 0) {
    return sortResult;
  }

  const pathResult = String(blockA?.path ?? "").localeCompare(
    String(blockB?.path ?? ""),
  );
  if (pathResult !== 0) {
    return pathResult;
  }

  // Preserve the original query order when fallback metadata cannot prove order.
  return 0;
}

export function compareBlocksByDocumentOrder(
  blockA = {},
  blockB = {},
  indexMap = new Map(),
) {
  const indexA = indexMap?.get?.(blockA.id);
  const indexB = indexMap?.get?.(blockB.id);
  const hasIndexA = Number.isFinite(indexA);
  const hasIndexB = Number.isFinite(indexB);

  if (hasIndexA && hasIndexB) {
    return indexA - indexB;
  }

  return compareBlocksByFallbackOrder(blockA, blockB);
}

export function hasCompleteDocumentOrder(blockArray = [], indexMap = new Map()) {
  if (!Array.isArray(blockArray) || blockArray.length <= 0) {
    return false;
  }

  const documentIndexArray = blockArray.map((block) => indexMap.get(block?.id));
  if (!documentIndexArray.every((index) => Number.isFinite(index))) {
    return false;
  }

  // Some SiYuan builds collapse a whole structural subtree to the same block index.
  // Those values are not sufficient to reconstruct the visible document order.
  return new Set(documentIndexArray).size === documentIndexArray.length;
}

function compareBlocksBySiblingOrder(
  parentId = "",
  blockA = {},
  blockB = {},
  indexMap = new Map(),
  siblingOrderMapByParentId = new Map(),
) {
  const siblingOrderMap = siblingOrderMapByParentId.get(parentId);
  if (siblingOrderMap?.size > 0) {
    const orderA = siblingOrderMap.get(blockA?.id);
    const orderB = siblingOrderMap.get(blockB?.id);
    const hasOrderA = Number.isFinite(orderA);
    const hasOrderB = Number.isFinite(orderB);

    if (hasOrderA && hasOrderB && orderA !== orderB) {
      return orderA - orderB;
    }
  }

  return compareBlocksByDocumentOrder(blockA, blockB, indexMap);
}

/**
 * 并发查询各父块的子块顺序，构建 parentId -> (childId -> index) 映射。
 * 兄弟块加载器与来源窗口排序共用此唯一实现。
 * @param {string[]} parentIdArray 需要排序的父块 ID 列表（调用方自行决定过滤条件）
 * @param {Object} deps 依赖注入（getChildBlocks）
 * @returns {Promise<Map<string, Map<string, number>>>}
 */
export async function getSiblingOrderMapByParentId(parentIdArray = [], deps = {}) {
  const { getChildBlocks } = deps;
  if (
    typeof getChildBlocks !== "function" ||
    !Array.isArray(parentIdArray) ||
    parentIdArray.length <= 0
  ) {
    return new Map();
  }

  const siblingOrderMapByParentId = new Map();
  await Promise.all(
    parentIdArray.filter(Boolean).map(async (parentId) => {
      const childBlocks = await getChildBlocks(parentId);
      if (!Array.isArray(childBlocks) || childBlocks.length <= 0) {
        return;
      }

      const siblingOrderMap = new Map();
      childBlocks.forEach((childBlock, index) => {
        if (childBlock?.id) {
          siblingOrderMap.set(childBlock.id, index);
        }
      });
      if (siblingOrderMap.size > 0) {
        siblingOrderMapByParentId.set(parentId, siblingOrderMap);
      }
    }),
  );

  return siblingOrderMapByParentId;
}

/**
 * 按父块的子块真实顺序就地排序列表；映射缺失的块排到最后（Infinity），
 * 元数据无法证明顺序时保持原查询顺序（与文档序回退变体刻意不同）。
 * 供兄弟块加载器使用；buildTreeOrderedBlocks 内部使用文档序回退变体。
 */
export function sortBlocksByParentSiblingOrder(
  parentId = "",
  blockArray = [],
  siblingOrderMapByParentId = new Map(),
) {
  const siblingOrderMap = siblingOrderMapByParentId.get(parentId);
  if (!siblingOrderMap || siblingOrderMap.size <= 0) {
    blockArray.sort(compareBlocksByFallbackOrder);
    return;
  }

  blockArray.sort((a, b) => {
    const orderA = siblingOrderMap.has(a?.id) ? siblingOrderMap.get(a.id) : Infinity;
    const orderB = siblingOrderMap.has(b?.id) ? siblingOrderMap.get(b.id) : Infinity;
    if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
      return orderA - orderB;
    }
    return 0;
  });
}

function extractBlockOrderMapFromKramdown(kramdown = "") {
  const blockOrderMap = new Map();
  if (!kramdown) {
    return blockOrderMap;
  }

  const blockIdPattern = /\bid="([^"]+)"/g;
  let match;
  let order = 0;
  while ((match = blockIdPattern.exec(kramdown))) {
    const blockId = match[1];
    if (!blockId || blockOrderMap.has(blockId)) {
      continue;
    }
    blockOrderMap.set(blockId, order);
    order += 1;
  }

  return blockOrderMap;
}

export async function getKramdownOrderMapByRootId(rootIdArray = [], deps = {}) {
  const { getBlockKramdown } = deps;
  if (typeof getBlockKramdown !== "function" || !Array.isArray(rootIdArray)) {
    return new Map();
  }

  const kramdownOrderMapByRootId = new Map();
  await Promise.all(
    rootIdArray.filter(Boolean).map(async (rootId) => {
      const result = await getBlockKramdown(rootId);
      const kramdown = result?.kramdown || "";
      const blockOrderMap = extractBlockOrderMapFromKramdown(kramdown);
      if (blockOrderMap.size > 0) {
        kramdownOrderMapByRootId.set(rootId, blockOrderMap);
      }
    }),
  );

  return kramdownOrderMapByRootId;
}

export function buildTreeOrderedBlocks(
  blockArray = [],
  rootId = "",
  indexMap = new Map(),
  siblingOrderMapByParentId = new Map(),
) {
  if (!Array.isArray(blockArray) || blockArray.length <= 0) {
    return [];
  }

  const blockById = new Map();
  const childBlocksByParentId = new Map();
  for (const block of blockArray) {
    if (!block?.id) {
      continue;
    }
    blockById.set(block.id, block);
    const parentId = block.parent_id || "";
    let childBlocks = childBlocksByParentId.get(parentId);
    if (!childBlocks) {
      childBlocks = [];
      childBlocksByParentId.set(parentId, childBlocks);
    }
    childBlocks.push(block);
  }

  for (const [parentId, childBlocks] of childBlocksByParentId.entries()) {
    childBlocks.sort((blockA, blockB) =>
      compareBlocksBySiblingOrder(
        parentId,
        blockA,
        blockB,
        indexMap,
        siblingOrderMapByParentId,
      ),
    );
  }

  const orderedBlocks = [];
  const visitedBlockIds = new Set();

  function visitChildren(parentId = "") {
    const childBlocks = childBlocksByParentId.get(parentId) || [];
    for (const childBlock of childBlocks) {
      if (!childBlock?.id || visitedBlockIds.has(childBlock.id)) {
        continue;
      }
      visitedBlockIds.add(childBlock.id);
      orderedBlocks.push(childBlock);
      visitChildren(childBlock.id);
    }
  }

  visitChildren(rootId);

  const orphanRootBlocks = blockArray
    .filter((block) => {
      if (!block?.id || visitedBlockIds.has(block.id)) {
        return false;
      }
      return !blockById.has(block.parent_id);
    })
    .sort((blockA, blockB) =>
      compareBlocksByDocumentOrder(blockA, blockB, indexMap),
    );

  for (const orphanBlock of orphanRootBlocks) {
    if (visitedBlockIds.has(orphanBlock.id)) {
      continue;
    }
    visitedBlockIds.add(orphanBlock.id);
    orderedBlocks.push(orphanBlock);
    visitChildren(orphanBlock.id);
  }

  if (visitedBlockIds.size < blockById.size) {
    const remainingBlocks = blockArray
      .filter((block) => block?.id && !visitedBlockIds.has(block.id))
      .sort((blockA, blockB) =>
        compareBlocksByDocumentOrder(blockA, blockB, indexMap),
      );

    for (const block of remainingBlocks) {
      if (visitedBlockIds.has(block.id)) {
        continue;
      }
      visitedBlockIds.add(block.id);
      orderedBlocks.push(block);
      visitChildren(block.id);
    }
  }

  return orderedBlocks;
}

export function buildDocumentBlockContext(orderedDocumentBlocks = []) {
  const indexById = new Map();
  const blockById = new Map();
  const documentOrderById = new Map();
  const childBlockIdsByParentId = new Map();

  orderedDocumentBlocks.forEach((block, index) => {
    if (!block?.id) {
      return;
    }
    indexById.set(block.id, index);
    blockById.set(block.id, block);
    const explicitDocumentOrder = Number(block.__backlinkSourceDocumentOrder);
    documentOrderById.set(
      block.id,
      Number.isFinite(explicitDocumentOrder) ? explicitDocumentOrder : index,
    );
    const parentId = block.parent_id || "";
    let childBlockIds = childBlockIdsByParentId.get(parentId);
    if (!childBlockIds) {
      childBlockIds = [];
      childBlockIdsByParentId.set(parentId, childBlockIds);
    }
    childBlockIds.push(block.id);
  });

  return {
    orderedDocumentBlocks,
    indexById,
    blockById,
    documentOrderById,
    childBlockIdsByParentId,
  };
}

export function getBlockDocumentOrder(blockId = "", context) {
  const explicitOrder = context?.documentOrderById?.get(blockId);
  if (Number.isFinite(explicitOrder)) {
    return explicitOrder;
  }

  const fallbackOrder = context?.indexById?.get(blockId);
  return Number.isFinite(fallbackOrder) ? fallbackOrder : undefined;
}
