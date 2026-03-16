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

  return 0;
}

function compareBlocksByDocumentOrder(
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
  if (hasIndexA !== hasIndexB) {
    return hasIndexA ? -1 : 1;
  }

  return compareBlocksByFallbackOrder(blockA, blockB);
}

function hasCompleteDocumentOrder(blockArray = [], indexMap = new Map()) {
  return blockArray.every((block) => Number.isFinite(indexMap.get(block?.id)));
}

function buildTreeOrderedBlocks(blockArray = [], rootId = "", indexMap = new Map()) {
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

  for (const childBlocks of childBlocksByParentId.values()) {
    childBlocks.sort((blockA, blockB) =>
      compareBlocksByDocumentOrder(blockA, blockB, indexMap),
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

function buildDocumentBlockContext(orderedDocumentBlocks = []) {
  const indexById = new Map();
  const blockById = new Map();
  const documentOrderById = new Map();

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
  });

  return {
    orderedDocumentBlocks,
    indexById,
    blockById,
    documentOrderById,
  };
}

function getBlockDocumentOrder(blockId = "", context) {
  const explicitOrder = context?.documentOrderById?.get(blockId);
  if (Number.isFinite(explicitOrder)) {
    return explicitOrder;
  }

  const fallbackOrder = context?.indexById?.get(blockId);
  return Number.isFinite(fallbackOrder) ? fallbackOrder : undefined;
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

function isDescendantBlock(block = null, ancestorBlockId = "", blockById = new Map()) {
  if (!block?.id || !ancestorBlockId || block.id === ancestorBlockId) {
    return false;
  }

  const visitedBlockIdSet = new Set();
  let currentBlock = block;
  while (currentBlock?.parent_id && !visitedBlockIdSet.has(currentBlock.id)) {
    if (currentBlock.parent_id === ancestorBlockId) {
      return true;
    }
    visitedBlockIdSet.add(currentBlock.id);
    currentBlock = blockById.get(currentBlock.parent_id);
  }

  return false;
}

function findBlockSubtreeEndIndex(startIndex, context) {
  const anchorBlockId = context.orderedDocumentBlocks[startIndex]?.id;
  if (!anchorBlockId) {
    return startIndex;
  }

  let endIndex = startIndex;
  for (
    let currentIndex = startIndex + 1;
    currentIndex < context.orderedDocumentBlocks.length;
    currentIndex += 1
  ) {
    const block = context.orderedDocumentBlocks[currentIndex];
    if (!isDescendantBlock(block, anchorBlockId, context.blockById)) {
      break;
    }
    endIndex = currentIndex;
  }

  return endIndex;
}

function getBlockRangeEndIndex(blockId = "", context) {
  const startIndex = context.indexById.get(blockId);
  if (startIndex === undefined) {
    return undefined;
  }

  const block = context.blockById.get(blockId);
  if (block?.type === "i") {
    return findBlockSubtreeEndIndex(startIndex, context);
  }

  return startIndex;
}

function resolveFirstDescendantBlockId(blockId = "", context) {
  const startIndex = context.indexById.get(blockId);
  if (startIndex === undefined) {
    return blockId;
  }

  const block = context.blockById.get(blockId);
  if (block?.type !== "i") {
    return blockId;
  }

  const nextBlock = context.orderedDocumentBlocks[startIndex + 1];
  if (!isDescendantBlock(nextBlock, blockId, context.blockById)) {
    return blockId;
  }

  return nextBlock.id || blockId;
}

function resolveListItemAnchorBlockId(backlinkBlockNode = {}, context) {
  const backlinkBlock = backlinkBlockNode?.block;
  if (!backlinkBlock?.id) {
    return "";
  }
  if (backlinkBlock.type === "i") {
    return backlinkBlock.id;
  }

  const parentBlock = context.blockById.get(backlinkBlock.parent_id);
  if (parentBlock?.type === "i") {
    return parentBlock.id;
  }

  if (backlinkBlock.parentBlockType === "i" && backlinkBlock.parent_id) {
    return backlinkBlock.parent_id;
  }

  return "";
}

function dedupeBlockIdArray(blockIdArray = []) {
  const dedupedBlockIds = [];
  const seenBlockIds = new Set();
  for (const blockId of blockIdArray) {
    if (!blockId || seenBlockIds.has(blockId)) {
      continue;
    }
    seenBlockIds.add(blockId);
    dedupedBlockIds.push(blockId);
  }
  return dedupedBlockIds;
}

function getHeadingLevel(block = {}) {
  if (block?.type !== "h") {
    return Number.POSITIVE_INFINITY;
  }

  const headingMatch = String(block?.subtype ?? "").match(/^h([1-6])$/i);
  if (!headingMatch) {
    return 6;
  }

  return Number(headingMatch[1]);
}

function findContainingHeadingStartIndex(focusIndex, orderedDocumentBlocks = []) {
  for (let currentIndex = focusIndex; currentIndex >= 0; currentIndex -= 1) {
    if (orderedDocumentBlocks[currentIndex]?.type === "h") {
      return currentIndex;
    }
  }
  return -1;
}

function findSectionEndIndexByHeadingStart(startIndex, orderedDocumentBlocks = []) {
  if (startIndex < 0) {
    return orderedDocumentBlocks.length - 1;
  }

  const startHeadingLevel = getHeadingLevel(orderedDocumentBlocks[startIndex]);
  for (
    let currentIndex = startIndex + 1;
    currentIndex < orderedDocumentBlocks.length;
    currentIndex += 1
  ) {
    const block = orderedDocumentBlocks[currentIndex];
    if (block?.type !== "h") {
      continue;
    }
    if (getHeadingLevel(block) <= startHeadingLevel) {
      return currentIndex - 1;
    }
  }

  return orderedDocumentBlocks.length - 1;
}

function findFirstHeadingIndex(orderedDocumentBlocks = []) {
  for (let currentIndex = 0; currentIndex < orderedDocumentBlocks.length; currentIndex += 1) {
    if (orderedDocumentBlocks[currentIndex]?.type === "h") {
      return currentIndex;
    }
  }
  return -1;
}

function isStructuralContainerBlock(block = {}) {
  return block?.type === "l" || block?.type === "i";
}

function resolveTopLevelStructuralContainerBlockId(
  focusBlockId = "",
  rootId = "",
  context,
) {
  let currentBlock = context.blockById.get(focusBlockId);
  if (!currentBlock?.id) {
    return "";
  }

  let candidateBlock = currentBlock;
  const visitedBlockIds = new Set();
  while (currentBlock?.id && !visitedBlockIds.has(currentBlock.id)) {
    visitedBlockIds.add(currentBlock.id);
    const parentBlock = context.blockById.get(currentBlock.parent_id);
    if (!parentBlock?.id || parentBlock.id === rootId || parentBlock.type === "d") {
      return candidateBlock?.id || currentBlock.id;
    }
    candidateBlock = parentBlock;
    currentBlock = parentBlock;
  }

  return candidateBlock?.id || focusBlockId;
}

function getDirectChildBlocks(parentBlockId = "", context) {
  const startIndex = context.indexById.get(parentBlockId);
  if (startIndex === undefined) {
    return [];
  }

  const childBlocks = [];
  for (
    let currentIndex = startIndex + 1;
    currentIndex < context.orderedDocumentBlocks.length;
    currentIndex += 1
  ) {
    const block = context.orderedDocumentBlocks[currentIndex];
    if (!isDescendantBlock(block, parentBlockId, context.blockById)) {
      break;
    }
    if (block?.parent_id === parentBlockId) {
      childBlocks.push(block);
    }
  }

  return childBlocks;
}

function resolveReadableListItemShellBlockIds(listItemBlockId = "", context) {
  if (!listItemBlockId) {
    return [];
  }

  const visibleBlockIds = [listItemBlockId];
  let currentListItemId = listItemBlockId;
  const visitedListItemIds = new Set();

  while (currentListItemId && !visitedListItemIds.has(currentListItemId)) {
    visitedListItemIds.add(currentListItemId);
    const directChildBlocks = getDirectChildBlocks(currentListItemId, context);
    const readableChildBlock = directChildBlocks.find((block) => block?.type !== "l");
    if (readableChildBlock?.id) {
      visibleBlockIds.push(readableChildBlock.id);
      break;
    }

    const childListBlock = directChildBlocks.find((block) => block?.type === "l");
    if (!childListBlock?.id) {
      break;
    }

    const firstChildListItem = getDirectChildBlocks(childListBlock.id, context).find(
      (block) => block?.type === "i",
    );
    if (!firstChildListItem?.id) {
      break;
    }

    visibleBlockIds.push(firstChildListItem.id);
    currentListItemId = firstChildListItem.id;
  }

  return dedupeBlockIdArray(visibleBlockIds);
}

function buildSourceWindowFromRange({
  backlinkBlockNode = null,
  context,
  anchorBlockId = "",
  startIndex,
  endIndex,
  startBlockId = "",
  endBlockId = "",
  visibleBlockIds = [],
  renderMode = "",
} = {}) {
  if (
    !backlinkBlockNode?.block?.id ||
    startIndex === undefined ||
    endIndex === undefined
  ) {
    return null;
  }

  const safeStartIndex = Math.max(0, startIndex);
  const safeEndIndex = Math.max(safeStartIndex, endIndex);
  const windowBlockIds = context.orderedDocumentBlocks
    .slice(safeStartIndex, safeEndIndex + 1)
    .map((block) => block.id);
  if (windowBlockIds.length <= 0) {
    return null;
  }

  const sourceWindow = {
    rootId: backlinkBlockNode.block.root_id,
    anchorBlockId: anchorBlockId || backlinkBlockNode.block.id,
    startBlockId: startBlockId || windowBlockIds[0],
    endBlockId: endBlockId || windowBlockIds[windowBlockIds.length - 1],
    focusBlockId: backlinkBlockNode.block.id,
    sourceDocumentOrder: getBlockDocumentOrder(backlinkBlockNode.block.id, context),
    windowBlockIds,
    defaultExpandMode: "document_local_full",
  };

  const dedupedVisibleBlockIds = dedupeBlockIdArray(visibleBlockIds);
  if (dedupedVisibleBlockIds.length > 0) {
    sourceWindow.visibleBlockIds = dedupedVisibleBlockIds;
  }
  if (renderMode) {
    sourceWindow.renderMode = renderMode;
  }

  return sourceWindow;
}

function buildCoreBacklinkSourceWindow(backlinkBlockNode, context) {
  const listItemAnchorBlockId = resolveListItemAnchorBlockId(backlinkBlockNode, context);
  if (listItemAnchorBlockId) {
    const startIndex = context.indexById.get(listItemAnchorBlockId);
    return buildSourceWindowFromRange({
      backlinkBlockNode,
      context,
      anchorBlockId: listItemAnchorBlockId,
      startIndex,
      endIndex: findBlockSubtreeEndIndex(startIndex, context),
      visibleBlockIds:
        backlinkBlockNode.block.id === listItemAnchorBlockId
          ? [listItemAnchorBlockId]
          : [listItemAnchorBlockId, backlinkBlockNode.block.id],
      renderMode: "scroll",
    });
  }

  const focusIndex = context.indexById.get(backlinkBlockNode.block.id);
  return buildSourceWindowFromRange({
    backlinkBlockNode,
    context,
    anchorBlockId: backlinkBlockNode.block.id,
    startIndex: focusIndex,
    endIndex: focusIndex,
    renderMode: "scroll",
  });
}

function buildNearbyBacklinkSourceWindow(backlinkBlockNode, context) {
  const listItemAnchorBlockId = resolveListItemAnchorBlockId(backlinkBlockNode, context);
  const anchorBlockId = listItemAnchorBlockId || backlinkBlockNode.block.id;
  const anchorStartIndex = context.indexById.get(anchorBlockId);
  if (anchorStartIndex === undefined) {
    return null;
  }

  const isListItemContext = !!listItemAnchorBlockId;
  let startBlockId, endBlockId;

  if (isListItemContext) {
    startBlockId = backlinkBlockNode.previousSiblingBlockId || anchorBlockId;
    endBlockId = backlinkBlockNode.nextSiblingBlockId || anchorBlockId;
  } else {
    const prevIndex = anchorStartIndex - 1;
    const nextIndex = anchorStartIndex + 1;
    startBlockId = prevIndex >= 0 ? context.orderedDocumentBlocks[prevIndex]?.id : null;
    endBlockId = nextIndex < context.orderedDocumentBlocks.length ? context.orderedDocumentBlocks[nextIndex]?.id : null;
  }

  const renderStartBlockId = resolveFirstDescendantBlockId(startBlockId, context);
  const startIndex = context.indexById.get(startBlockId) ?? anchorStartIndex;
  const endIndex = getBlockRangeEndIndex(endBlockId, context) ?? getBlockRangeEndIndex(anchorBlockId, context);
  const sourceWindowStartBlockId = isListItemContext
    ? startBlockId
    : renderStartBlockId;
  const sourceWindowEndBlockId = isListItemContext
    ? endBlockId
    : undefined;

  return buildSourceWindowFromRange({
    backlinkBlockNode,
    context,
    anchorBlockId,
    startIndex,
    endIndex,
    startBlockId: sourceWindowStartBlockId,
    endBlockId: sourceWindowEndBlockId,
    visibleBlockIds: isListItemContext
      ? dedupeBlockIdArray([
          ...resolveReadableListItemShellBlockIds(startBlockId, context),
          anchorBlockId,
          backlinkBlockNode.block.id,
          ...resolveReadableListItemShellBlockIds(endBlockId, context),
        ])
      : dedupeBlockIdArray([
          startBlockId,
          backlinkBlockNode.block.id,
          endBlockId,
        ]),
    renderMode: "scroll",
  });
}

function buildExtendedBacklinkSourceWindow(backlinkBlockNode, context) {
  const focusBlockId = backlinkBlockNode.block.id;
  const focusIndex = context.indexById.get(focusBlockId);
  if (focusIndex === undefined) {
    return null;
  }

  const focusBlock = context.blockById.get(focusBlockId);
  if (focusBlock?.type === "h") {
    const previousIndex = focusIndex - 1;
    let safeStartIndex = focusIndex;
    if (previousIndex >= 0) {
      const previousSectionHeadingStartIndex = findContainingHeadingStartIndex(
        previousIndex,
        context.orderedDocumentBlocks,
      );
      safeStartIndex =
        previousSectionHeadingStartIndex >= 0
          ? previousSectionHeadingStartIndex
          : 0;
    }
    const safeEndIndex = Math.max(
      focusIndex,
      findSectionEndIndexByHeadingStart(
        focusIndex,
        context.orderedDocumentBlocks,
      ),
    );

    return buildSourceWindowFromRange({
      backlinkBlockNode,
      context,
      anchorBlockId: focusBlockId,
      startIndex: safeStartIndex,
      endIndex: safeEndIndex,
      renderMode: "scroll",
    });
  }

  const sectionHeadingStartIndex = findContainingHeadingStartIndex(
    focusIndex,
    context.orderedDocumentBlocks,
  );

  let safeStartIndex;
  let safeEndIndex;
  if (sectionHeadingStartIndex >= 0) {
    safeStartIndex = sectionHeadingStartIndex;
    safeEndIndex = Math.max(
      safeStartIndex,
      findSectionEndIndexByHeadingStart(
        sectionHeadingStartIndex,
        context.orderedDocumentBlocks,
      ),
    );
  } else {
    const topLevelContainerBlockId = resolveTopLevelStructuralContainerBlockId(
      focusBlockId,
      backlinkBlockNode.block.root_id,
      context,
    );
    const topLevelContainerBlock = context.blockById.get(topLevelContainerBlockId);
    if (isStructuralContainerBlock(topLevelContainerBlock)) {
      safeStartIndex = context.indexById.get(topLevelContainerBlockId);
      safeEndIndex = findBlockSubtreeEndIndex(safeStartIndex, context);
    } else {
      safeStartIndex = 0;
      const firstHeadingIndex = findFirstHeadingIndex(context.orderedDocumentBlocks);
      safeEndIndex =
        firstHeadingIndex > 0
          ? firstHeadingIndex - 1
          : context.orderedDocumentBlocks.length - 1;
    }
  }

  return buildSourceWindowFromRange({
    backlinkBlockNode,
    context,
    anchorBlockId: focusBlockId,
    startIndex: safeStartIndex,
    endIndex: safeEndIndex,
    renderMode: "scroll",
  });
}

export function buildBacklinkSourceWindow({
  backlinkBlockNode = null,
  orderedDocumentBlocks = [],
  contextVisibilityLevel = "core",
} = {}) {
  if (
    !backlinkBlockNode?.block?.id ||
    !Array.isArray(orderedDocumentBlocks) ||
    orderedDocumentBlocks.length <= 0
  ) {
    return null;
  }

  const context = buildDocumentBlockContext(orderedDocumentBlocks);
  if (contextVisibilityLevel === "core") {
    return buildCoreBacklinkSourceWindow(backlinkBlockNode, context);
  }
  if (contextVisibilityLevel === "nearby") {
    return buildNearbyBacklinkSourceWindow(backlinkBlockNode, context);
  }
  if (contextVisibilityLevel === "extended") {
    return buildExtendedBacklinkSourceWindow(backlinkBlockNode, context);
  }
  return null;
}

export function attachBacklinkSourceWindows({
  backlinkDataArray = [],
  backlinkBlockNodeArray = [],
  orderedBlocksByRootId = new Map(),
  contextVisibilityLevel = "extended",
  } = {}) {
  if (!Array.isArray(backlinkDataArray)) {
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

    backlinkBlockNode.sourceWindows = {
      core: buildBacklinkSourceWindow({
        backlinkBlockNode,
        orderedDocumentBlocks,
        contextVisibilityLevel: "core",
      }),
      nearby: buildBacklinkSourceWindow({
        backlinkBlockNode,
        orderedDocumentBlocks,
        contextVisibilityLevel: "nearby",
      }),
      extended: buildBacklinkSourceWindow({
        backlinkBlockNode,
        orderedDocumentBlocks,
        contextVisibilityLevel: "extended",
      }),
    };
    backlinkBlockNode.sourceWindow = backlinkBlockNode.sourceWindows.extended;

    backlinkData.sourceWindows = backlinkBlockNode.sourceWindows;
    backlinkData.sourceWindow = backlinkBlockNode.sourceWindow;
    backlinkData.sourceDocumentOrder =
      backlinkBlockNode.sourceWindows?.core?.sourceDocumentOrder;
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

  for (const [rootId, blockArray] of orderedBlocksByRootId.entries()) {
    if (hasCompleteDocumentOrder(blockArray, indexMap)) {
      blockArray.forEach((block) => {
        block.__backlinkSourceDocumentOrder = indexMap.get(block.id);
      });
      blockArray.sort((blockA, blockB) =>
        compareBlocksByDocumentOrder(blockA, blockB, indexMap),
      );
      continue;
    }

    blockArray.forEach((block) => {
      delete block.__backlinkSourceDocumentOrder;
    });
    const orderedBlocks = buildTreeOrderedBlocks(blockArray, rootId, new Map());
    blockArray.length = 0;
    blockArray.push(...orderedBlocks);
  }

  return orderedBlocksByRootId;
}
