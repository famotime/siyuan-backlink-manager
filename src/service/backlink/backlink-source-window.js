function getBlockSortValue(block = {}) {
  const sortValue = Number(block?.sort ?? 0);
  return Number.isFinite(sortValue) ? sortValue : 0;
}

function compareBlocksByFallbackOrder(blockA = {}, blockB = {}) {
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

  return String(blockA?.id ?? "").localeCompare(String(blockB?.id ?? ""));
}

function buildDocumentBlockContext(orderedDocumentBlocks = []) {
  const blockById = new Map();
  const indexById = new Map();

  orderedDocumentBlocks.forEach((block, index) => {
    if (!block?.id) {
      return;
    }
    blockById.set(block.id, block);
    indexById.set(block.id, index);
  });

  return {
    orderedDocumentBlocks,
    blockById,
    indexById,
    ancestorIdArrayCache: new Map(),
  };
}

function getAncestorIdArray(blockId, context) {
  if (!blockId) {
    return [];
  }
  if (context.ancestorIdArrayCache.has(blockId)) {
    return context.ancestorIdArrayCache.get(blockId);
  }

  const ancestorIdArray = [];
  const visitedBlockIdSet = new Set();
  let currentBlock = context.blockById.get(blockId);

  while (currentBlock?.parent_id && !visitedBlockIdSet.has(currentBlock.parent_id)) {
    visitedBlockIdSet.add(currentBlock.parent_id);
    ancestorIdArray.push(currentBlock.parent_id);
    currentBlock = context.blockById.get(currentBlock.parent_id);
  }

  context.ancestorIdArrayCache.set(blockId, ancestorIdArray);
  return ancestorIdArray;
}

function getSubtreeEndIndex(blockId, context) {
  const startIndex = context.indexById.get(blockId);
  if (startIndex === undefined) {
    return -1;
  }

  let endIndex = startIndex;
  for (let currentIndex = startIndex + 1; currentIndex < context.orderedDocumentBlocks.length; currentIndex += 1) {
    const currentBlock = context.orderedDocumentBlocks[currentIndex];
    const ancestorIdArray = getAncestorIdArray(currentBlock?.id, context);
    if (ancestorIdArray.includes(blockId)) {
      endIndex = currentIndex;
      continue;
    }
    if (endIndex > startIndex) {
      break;
    }
  }

  return endIndex;
}

function getHeadingParentIdArray(backlinkBlockNode = {}, context) {
  const parentContextBlockIds = Array.isArray(backlinkBlockNode.parentContextBlockIds)
    ? backlinkBlockNode.parentContextBlockIds
    : [];
  return parentContextBlockIds.filter((blockId) => {
    const parentBlock = context.blockById.get(blockId);
    return parentBlock?.type === "h";
  });
}

function expandWindowStart(startIndex, blockIds = [], context) {
  let nextStartIndex = startIndex;
  for (const blockId of blockIds) {
    const blockIndex = context.indexById.get(blockId);
    if (blockIndex === undefined) {
      continue;
    }
    nextStartIndex = Math.min(nextStartIndex, blockIndex);
  }
  return nextStartIndex;
}

function expandWindowEnd(endIndex, blockIds = [], context) {
  let nextEndIndex = endIndex;
  for (const blockId of blockIds) {
    const blockEndIndex = getSubtreeEndIndex(blockId, context);
    if (blockEndIndex < 0) {
      continue;
    }
    nextEndIndex = Math.max(nextEndIndex, blockEndIndex);
  }
  return nextEndIndex;
}

function getFirstBlockId(blockIdArray = []) {
  return Array.isArray(blockIdArray) && blockIdArray.length > 0
    ? blockIdArray[0]
    : null;
}

function getLastBlockId(blockIdArray = []) {
  return Array.isArray(blockIdArray) && blockIdArray.length > 0
    ? blockIdArray[blockIdArray.length - 1]
    : null;
}

export function buildBacklinkSourceWindow({
  backlinkBlockNode = null,
  orderedDocumentBlocks = [],
  contextVisibilityLevel = "core",
} = {}) {
  if (
    contextVisibilityLevel !== "extended" ||
    !backlinkBlockNode?.block?.id ||
    !Array.isArray(orderedDocumentBlocks) ||
    orderedDocumentBlocks.length <= 0
  ) {
    return null;
  }

  const context = buildDocumentBlockContext(orderedDocumentBlocks);
  const focusBlockId = backlinkBlockNode.block.id;
  const focusIndex = context.indexById.get(focusBlockId);
  if (focusIndex === undefined) {
    return null;
  }

  const currentContainerBlockId =
    backlinkBlockNode.parentListItemTreeNode?.id || focusBlockId;
  const beforeExpandedBlockIdArray = Array.isArray(
    backlinkBlockNode.beforeExpandedBlockIdArray,
  )
    ? backlinkBlockNode.beforeExpandedBlockIdArray
    : [];
  const afterExpandedBlockIdArray = Array.isArray(
    backlinkBlockNode.afterExpandedBlockIdArray,
  )
    ? backlinkBlockNode.afterExpandedBlockIdArray
    : [];

  let startIndex = focusIndex;
  let endIndex = focusIndex;

  startIndex = expandWindowStart(
    startIndex,
    [
      getFirstBlockId(beforeExpandedBlockIdArray),
      backlinkBlockNode.previousSiblingBlockId,
      currentContainerBlockId,
    ],
    context,
  );
  endIndex = expandWindowEnd(
    endIndex,
    [
      currentContainerBlockId,
      backlinkBlockNode.nextSiblingBlockId,
      getLastBlockId(afterExpandedBlockIdArray),
    ],
    context,
  );

  const headingParentIdArray = getHeadingParentIdArray(backlinkBlockNode, context);
  if (headingParentIdArray.length > 0) {
    startIndex = expandWindowStart(startIndex, [headingParentIdArray[0]], context);
    endIndex = expandWindowEnd(
      endIndex,
      [headingParentIdArray[headingParentIdArray.length - 1]],
      context,
    );
  } else if (backlinkBlockNode.block.type === "h") {
    startIndex = expandWindowStart(startIndex, [focusBlockId], context);
    endIndex = expandWindowEnd(endIndex, [focusBlockId], context);
  }

  const safeStartIndex = Math.max(0, Math.min(startIndex, endIndex));
  const safeEndIndex = Math.min(
    context.orderedDocumentBlocks.length - 1,
    Math.max(startIndex, endIndex),
  );
  const windowBlockIds = context.orderedDocumentBlocks
    .slice(safeStartIndex, safeEndIndex + 1)
    .map((block) => block.id);

  if (windowBlockIds.length <= 0) {
    return null;
  }

  return {
    rootId: backlinkBlockNode.block.root_id,
    anchorBlockId: focusBlockId,
    startBlockId: windowBlockIds[0],
    endBlockId: windowBlockIds[windowBlockIds.length - 1],
    focusBlockId,
    windowBlockIds,
    defaultExpandMode: "document_local_full",
  };
}

export function attachBacklinkSourceWindows({
  backlinkDataArray = [],
  backlinkBlockNodeArray = [],
  orderedBlocksByRootId = new Map(),
  contextVisibilityLevel = "extended",
} = {}) {
  if (contextVisibilityLevel !== "extended" || !Array.isArray(backlinkDataArray)) {
    return backlinkDataArray;
  }

  const backlinkBlockNodeMap = new Map();
  for (const backlinkBlockNode of backlinkBlockNodeArray || []) {
    if (backlinkBlockNode?.block?.id) {
      backlinkBlockNodeMap.set(backlinkBlockNode.block.id, backlinkBlockNode);
    }
  }

  for (const backlinkData of backlinkDataArray) {
    const backlinkBlockId = backlinkData?.backlinkBlock?.id;
    if (!backlinkBlockId) {
      continue;
    }

    const backlinkBlockNode = backlinkBlockNodeMap.get(backlinkBlockId);
    const orderedDocumentBlocks = orderedBlocksByRootId.get(
      backlinkData?.backlinkBlock?.root_id,
    );
    if (!backlinkBlockNode || !Array.isArray(orderedDocumentBlocks)) {
      continue;
    }

    backlinkData.sourceWindow = buildBacklinkSourceWindow({
      backlinkBlockNode,
      orderedDocumentBlocks,
      contextVisibilityLevel,
    });
  }

  return backlinkDataArray;
}

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

export async function loadOrderedBacklinkSourceWindowBlocks({
  backlinkDataArray = [],
  deps = {},
} = {}) {
  const { queryDocumentBlocksByRootIds, getBlockIndexMap } = deps;
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

  for (const blockArray of orderedBlocksByRootId.values()) {
    blockArray.sort((blockA, blockB) => {
      const indexA = indexMap?.get?.(blockA.id);
      const indexB = indexMap?.get?.(blockB.id);
      const hasIndexA = Number.isFinite(indexA);
      const hasIndexB = Number.isFinite(indexB);

      if (hasIndexA && hasIndexB && indexA !== indexB) {
        return indexA - indexB;
      }
      if (hasIndexA !== hasIndexB) {
        return hasIndexA ? -1 : 1;
      }

      return compareBlocksByFallbackOrder(blockA, blockB);
    });
  }

  return orderedBlocksByRootId;
}
