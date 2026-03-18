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
  return blockArray.every((block) => Number.isFinite(indexMap.get(block?.id)));
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

export async function getSiblingOrderMapByParentId(blockArray = [], deps = {}) {
  const { getChildBlocks } = deps;
  if (typeof getChildBlocks !== "function" || !Array.isArray(blockArray)) {
    return new Map();
  }

  const childCountByParentId = new Map();
  for (const block of blockArray) {
    const parentId = block?.parent_id;
    if (!parentId) {
      continue;
    }
    childCountByParentId.set(parentId, (childCountByParentId.get(parentId) ?? 0) + 1);
  }

  const candidateParentIds = Array.from(childCountByParentId.entries())
    .filter(([parentId, childCount]) => parentId && childCount > 1)
    .map(([parentId]) => parentId);
  if (candidateParentIds.length <= 0) {
    return new Map();
  }

  const siblingOrderMapByParentId = new Map();
  await Promise.all(
    candidateParentIds.map(async (parentId) => {
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
