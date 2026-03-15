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
  const indexById = new Map();

  orderedDocumentBlocks.forEach((block, index) => {
    if (!block?.id) {
      return;
    }
    indexById.set(block.id, index);
  });

  return {
    orderedDocumentBlocks,
    indexById,
  };
}

function findNearestHeadingStartIndex(focusIndex, orderedDocumentBlocks = []) {
  for (let currentIndex = focusIndex; currentIndex >= 0; currentIndex -= 1) {
    if (orderedDocumentBlocks[currentIndex]?.type === "h") {
      return currentIndex;
    }
  }
  return 0;
}

function findNearestHeadingEndIndex(focusIndex, orderedDocumentBlocks = []) {
  for (
    let currentIndex = focusIndex + 1;
    currentIndex < orderedDocumentBlocks.length;
    currentIndex += 1
  ) {
    if (orderedDocumentBlocks[currentIndex]?.type === "h") {
      return currentIndex - 1;
    }
  }
  return orderedDocumentBlocks.length - 1;
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

  const safeStartIndex = findNearestHeadingStartIndex(
    focusIndex,
    context.orderedDocumentBlocks,
  );
  const safeEndIndex = Math.max(
    safeStartIndex,
    findNearestHeadingEndIndex(focusIndex, context.orderedDocumentBlocks),
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
