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

  // Preserve the original query order when fallback metadata cannot prove order.
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

  return compareBlocksByFallbackOrder(blockA, blockB);
}

function hasCompleteDocumentOrder(blockArray = [], indexMap = new Map()) {
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

async function getSiblingOrderMapByParentId(blockArray = [], deps = {}) {
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

async function getKramdownOrderMapByRootId(rootIdArray = [], deps = {}) {
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

function buildTreeOrderedBlocks(
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

function buildDocumentBlockContext(orderedDocumentBlocks = []) {
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

function getBlockDocumentOrder(blockId = "", context) {
  const explicitOrder = context?.documentOrderById?.get(blockId);
  if (Number.isFinite(explicitOrder)) {
    return explicitOrder;
  }

  const fallbackOrder = context?.indexById?.get(blockId);
  return Number.isFinite(fallbackOrder) ? fallbackOrder : undefined;
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

function getMaxIndexedBlockEntry(
  blockIdArray = [],
  context,
  fallbackIndex = undefined,
  fallbackBlockId = "",
) {
  let maxIndex = Number.isFinite(fallbackIndex) ? fallbackIndex : undefined;
  let maxBlockId = fallbackBlockId || "";

  for (const blockId of blockIdArray) {
    const blockIndex = context?.indexById?.get(blockId);
    if (!Number.isFinite(blockIndex)) {
      continue;
    }
    if (maxIndex === undefined || blockIndex > maxIndex) {
      maxIndex = blockIndex;
      maxBlockId = blockId;
    }
  }

  return {
    index: maxIndex,
    blockId: maxBlockId,
  };
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

function orderBlockIdsByWindowOrder(windowBlockIds = [], blockIds = []) {
  const dedupedBlockIds = dedupeBlockIdArray(blockIds);
  if (!Array.isArray(windowBlockIds) || windowBlockIds.length <= 0) {
    return dedupedBlockIds;
  }

  const blockIdSet = new Set(dedupedBlockIds);
  const orderedBlockIds = windowBlockIds.filter((blockId) => blockIdSet.has(blockId));
  if (orderedBlockIds.length >= dedupedBlockIds.length) {
    return orderedBlockIds;
  }

  const orderedBlockIdSet = new Set(orderedBlockIds);
  for (const blockId of dedupedBlockIds) {
    if (!orderedBlockIdSet.has(blockId)) {
      orderedBlockIds.push(blockId);
    }
  }
  return orderedBlockIds;
}

function buildSourceWindowContextPlan({
  rootId = "",
  anchorBlockId = "",
  focusBlockId = "",
  sourceDocumentOrder,
  startBlockId = "",
  endBlockId = "",
  windowBlockIds = [],
  orderedVisibleBlockIds = [],
  context,
} = {}) {
  const collapsedBlockIdSet = new Set(windowBlockIds);
  for (const blockId of orderedVisibleBlockIds) {
    collapsedBlockIdSet.delete(blockId);
  }

  const structuralShellBlockIds = orderedVisibleBlockIds.filter((blockId) => {
    const blockType = context?.blockById?.get(blockId)?.type;
    return blockType === "h" || blockType === "i" || blockType === "l";
  });

  return {
    identity: {
      rootId,
      anchorBlockId,
      focusBlockId,
      sourceDocumentOrder,
    },
    bodyRange: {
      startBlockId,
      endBlockId,
      windowBlockIds,
    },
    orderedVisibleBlockIds,
    collapsedBlockIds: Array.from(collapsedBlockIdSet),
    structuralShellBlockIds,
  };
}

function buildSourceWindowFromContextPlan({
  contextPlan = null,
  renderMode = "",
  defaultExpandMode = "document_local_full",
} = {}) {
  if (!contextPlan) {
    return null;
  }

  const identity = contextPlan.identity || {};
  const bodyRange = contextPlan.bodyRange || {};
  const sourceWindow = {
    rootId: identity.rootId || "",
    anchorBlockId: identity.anchorBlockId || "",
    startBlockId: bodyRange.startBlockId || "",
    endBlockId: bodyRange.endBlockId || "",
    focusBlockId: identity.focusBlockId || "",
    sourceDocumentOrder: identity.sourceDocumentOrder,
    windowBlockIds: Array.isArray(bodyRange.windowBlockIds)
      ? bodyRange.windowBlockIds
      : [],
    orderedVisibleBlockIds: Array.isArray(contextPlan.orderedVisibleBlockIds)
      ? contextPlan.orderedVisibleBlockIds
      : [],
    contextPlan,
    defaultExpandMode,
  };
  sourceWindow.visibleBlockIds = dedupeBlockIdArray(
    sourceWindow.orderedVisibleBlockIds,
  );
  if (renderMode) {
    sourceWindow.renderMode = renderMode;
  }

  return sourceWindow;
}

export function getBacklinkSourceWindowContextPlan(sourceWindow = null) {
  return sourceWindow?.contextPlan || null;
}

export function getBacklinkSourceWindowByLevel(
  backlinkData = null,
  contextVisibilityLevel = "core",
) {
  if (!backlinkData) {
    return null;
  }

  const sourceWindows = backlinkData.sourceWindows;
  if (sourceWindows && sourceWindows[contextVisibilityLevel]) {
    return sourceWindows[contextVisibilityLevel];
  }

  if (contextVisibilityLevel === "extended") {
    return backlinkData.sourceWindow || null;
  }

  return null;
}

export function getBacklinkDataSourceDocumentOrder(backlinkData = null) {
  if (Number.isFinite(backlinkData?.sourceDocumentOrder)) {
    return backlinkData.sourceDocumentOrder;
  }

  const sourceWindowIdentity = getBacklinkSourceWindowIdentity(
    getBacklinkSourceWindowByLevel(backlinkData, "core"),
  );
  if (Number.isFinite(sourceWindowIdentity?.sourceDocumentOrder)) {
    return sourceWindowIdentity.sourceDocumentOrder;
  }

  return Number.POSITIVE_INFINITY;
}

export function getBacklinkSourceWindowIdentity(sourceWindow = null) {
  const contextPlan = getBacklinkSourceWindowContextPlan(sourceWindow);
  if (!sourceWindow) {
    return null;
  }

  const identity = contextPlan?.identity || {};
  return {
    rootId: identity.rootId || sourceWindow.rootId || "",
    anchorBlockId: identity.anchorBlockId || sourceWindow.anchorBlockId || "",
    focusBlockId: identity.focusBlockId || sourceWindow.focusBlockId || "",
    sourceDocumentOrder:
      identity.sourceDocumentOrder ?? sourceWindow.sourceDocumentOrder,
  };
}

export function getBacklinkSourceWindowBodyRange(sourceWindow = null) {
  const contextPlan = getBacklinkSourceWindowContextPlan(sourceWindow);
  if (!sourceWindow) {
    return null;
  }

  const bodyRange = contextPlan?.bodyRange || {};
  return {
    startBlockId: bodyRange.startBlockId || sourceWindow.startBlockId || "",
    endBlockId: bodyRange.endBlockId || sourceWindow.endBlockId || "",
    windowBlockIds: Array.isArray(bodyRange.windowBlockIds) && bodyRange.windowBlockIds.length > 0
      ? bodyRange.windowBlockIds
      : Array.isArray(sourceWindow.windowBlockIds)
      ? sourceWindow.windowBlockIds
      : [],
  };
}

export function getBacklinkSourceWindowOrderedVisibleBlockIds(sourceWindow = null) {
  const contextPlan = getBacklinkSourceWindowContextPlan(sourceWindow);
  if (
    Array.isArray(contextPlan?.orderedVisibleBlockIds) &&
    contextPlan.orderedVisibleBlockIds.length > 0
  ) {
    return contextPlan.orderedVisibleBlockIds;
  }
  if (
    Array.isArray(sourceWindow?.orderedVisibleBlockIds) &&
    sourceWindow.orderedVisibleBlockIds.length > 0
  ) {
    return sourceWindow.orderedVisibleBlockIds;
  }
  if (
    Array.isArray(sourceWindow?.visibleBlockIds) &&
    sourceWindow.visibleBlockIds.length > 0
  ) {
    return sourceWindow.visibleBlockIds;
  }
  return Array.isArray(sourceWindow?.windowBlockIds) ? sourceWindow.windowBlockIds : [];
}

export function getBacklinkSourceWindowCollapsedBlockIds(sourceWindow = null) {
  const contextPlan = getBacklinkSourceWindowContextPlan(sourceWindow);
  if (Array.isArray(contextPlan?.collapsedBlockIds)) {
    return contextPlan.collapsedBlockIds;
  }
  return Array.isArray(sourceWindow?.collapsedBlockIds)
    ? sourceWindow.collapsedBlockIds
    : [];
}

export function hasBacklinkSourceWindowExplicitVisibleBlockIds(sourceWindow = null) {
  const collapsedBlockIds = getBacklinkSourceWindowCollapsedBlockIds(sourceWindow);
  if (collapsedBlockIds.length > 0) {
    return true;
  }
  const visibleBlockIds = dedupeBlockIdArray(
    Array.isArray(sourceWindow?.visibleBlockIds) ? sourceWindow.visibleBlockIds : [],
  );
  const windowBlockIds = dedupeBlockIdArray(
    Array.isArray(sourceWindow?.windowBlockIds) ? sourceWindow.windowBlockIds : [],
  );
  if (visibleBlockIds.length <= 0) {
    return false;
  }
  if (visibleBlockIds.length !== windowBlockIds.length) {
    return true;
  }
  return visibleBlockIds.some((blockId, index) => blockId !== windowBlockIds[index]);
}

export function getBacklinkSourceWindowCandidateBlockIds({
  backlinkBlockId = "",
  sourceWindow = null,
} = {}) {
  const sourceWindowIdentity = getBacklinkSourceWindowIdentity(sourceWindow) || {};
  const bodyRange = getBacklinkSourceWindowBodyRange(sourceWindow);
  return dedupeBlockIdArray([
    backlinkBlockId,
    sourceWindowIdentity.anchorBlockId,
    sourceWindowIdentity.focusBlockId,
    bodyRange?.startBlockId || "",
    bodyRange?.endBlockId || "",
  ]).filter(Boolean);
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
  const directChildBlockIds = context?.childBlockIdsByParentId?.get(parentBlockId);
  if (Array.isArray(directChildBlockIds)) {
    return directChildBlockIds
      .map((blockId) => context?.blockById?.get(blockId))
      .filter(Boolean);
  }

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

function getSiblingBlockIdByOffset(blockId = "", offset = 0, context) {
  if (!blockId || offset === 0) {
    return blockId || "";
  }

  const block = context?.blockById?.get(blockId);
  if (!block) {
    return "";
  }

  const siblingBlockIds = context?.childBlockIdsByParentId?.get(block.parent_id || "") || [];
  const siblingIndex = siblingBlockIds.indexOf(blockId);
  if (siblingIndex < 0) {
    return "";
  }

  return siblingBlockIds[siblingIndex + offset] || "";
}

function findNearestSiblingBlockIdByPredicate(
  blockId = "",
  direction = "previous",
  predicate = () => true,
  context,
) {
  const step = direction === "next" ? 1 : -1;
  let candidateBlockId = getSiblingBlockIdByOffset(blockId, step, context);

  while (candidateBlockId) {
    const candidateBlock = context?.blockById?.get(candidateBlockId);
    if (predicate(candidateBlock)) {
      return candidateBlockId;
    }
    candidateBlockId = getSiblingBlockIdByOffset(candidateBlockId, step, context);
  }

  return "";
}

function resolveReadableListItemShellBlockIds(listItemBlockId = "", context) {
  if (!listItemBlockId) {
    return [];
  }

  const visibleBlockIds = [listItemBlockId];
  const directChildBlocks = getDirectChildBlocks(listItemBlockId, context);
  const readableChildBlock = directChildBlocks.find((block) => block?.type !== "l");
  if (readableChildBlock?.id) {
    visibleBlockIds.push(readableChildBlock.id);
    return dedupeBlockIdArray(visibleBlockIds);
  }

  const childListBlock = directChildBlocks.find((block) => block?.type === "l");
  if (!childListBlock?.id) {
    return dedupeBlockIdArray(visibleBlockIds);
  }

  visibleBlockIds.push(childListBlock.id);
  const firstChildListItem = getDirectChildBlocks(childListBlock.id, context).find(
    (block) => block?.type === "i",
  );
  if (!firstChildListItem?.id) {
    return dedupeBlockIdArray(visibleBlockIds);
  }

  visibleBlockIds.push(firstChildListItem.id);
  const firstChildReadableBlock = getDirectChildBlocks(firstChildListItem.id, context).find(
    (block) => block?.type !== "l",
  );
  if (firstChildReadableBlock?.id) {
    visibleBlockIds.push(firstChildReadableBlock.id);
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
    focusBlockId: backlinkBlockNode.block.id,
    sourceDocumentOrder: getBlockDocumentOrder(backlinkBlockNode.block.id, context),
  };

  const orderedVisibleBlockIds = visibleBlockIds.length > 0
    ? orderBlockIdsByWindowOrder(windowBlockIds, visibleBlockIds)
    : windowBlockIds;
  const contextPlan = buildSourceWindowContextPlan({
    rootId: sourceWindow.rootId,
    anchorBlockId: sourceWindow.anchorBlockId,
    focusBlockId: sourceWindow.focusBlockId,
    sourceDocumentOrder: sourceWindow.sourceDocumentOrder,
    startBlockId: startBlockId || windowBlockIds[0],
    endBlockId: endBlockId || windowBlockIds[windowBlockIds.length - 1],
    windowBlockIds,
    orderedVisibleBlockIds,
    context,
  });
  return buildSourceWindowFromContextPlan({
    contextPlan,
    renderMode,
  });
}

function buildCoreBacklinkSourceWindow(backlinkBlockNode, context) {
  const listItemAnchorBlockId = resolveListItemAnchorBlockId(backlinkBlockNode, context);
  if (listItemAnchorBlockId) {
    const startIndex = context.indexById.get(listItemAnchorBlockId);
    const subtreeEndIndex = findBlockSubtreeEndIndex(startIndex, context);
    const shellBlockIds = resolveReadableListItemShellBlockIds(listItemAnchorBlockId, context);
    const visibleBlockIds =
      backlinkBlockNode.block.id === listItemAnchorBlockId
        ? shellBlockIds
        : dedupeBlockIdArray([...shellBlockIds, backlinkBlockNode.block.id]);
    const { index: visibleEndIndex } = getMaxIndexedBlockEntry(
      visibleBlockIds,
      context,
      startIndex,
      listItemAnchorBlockId,
    );
    const endIndex = Math.max(visibleEndIndex, subtreeEndIndex);
    return buildSourceWindowFromRange({
      backlinkBlockNode,
      context,
      anchorBlockId: listItemAnchorBlockId,
      startIndex,
      endIndex,
      visibleBlockIds,
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
    const focusBlock = context.blockById.get(anchorBlockId);
    if (focusBlock?.type === "h") {
      startBlockId = findNearestSiblingBlockIdByPredicate(
        anchorBlockId,
        "previous",
        (candidateBlock) => candidateBlock?.type && candidateBlock.type !== "h",
        context,
      );
      endBlockId = findNearestSiblingBlockIdByPredicate(
        anchorBlockId,
        "next",
        (candidateBlock) => candidateBlock?.type && candidateBlock.type !== "h",
        context,
      );
    } else {
      startBlockId = getSiblingBlockIdByOffset(anchorBlockId, -1, context);
      endBlockId = getSiblingBlockIdByOffset(anchorBlockId, 1, context);
    }
  }

  const renderStartBlockId = resolveFirstDescendantBlockId(startBlockId, context);
  const startIndex =
    context.indexById.get(startBlockId) ??
    context.indexById.get(anchorBlockId) ??
    anchorStartIndex;
  const boundaryBlockIds = isListItemContext
    ? dedupeBlockIdArray([
        ...resolveReadableListItemShellBlockIds(startBlockId, context),
        anchorBlockId,
        backlinkBlockNode.block.id,
        ...resolveReadableListItemShellBlockIds(endBlockId, context),
      ])
    : dedupeBlockIdArray([
        startBlockId || anchorBlockId,
        backlinkBlockNode.block.id,
        endBlockId || anchorBlockId,
      ]);
  const listContextWindowEnd = getMaxIndexedBlockEntry(
    boundaryBlockIds,
    context,
    anchorStartIndex,
    anchorBlockId,
  );
  const endIndex = isListItemContext
    ? listContextWindowEnd.index
    : getBlockRangeEndIndex(endBlockId, context) ?? getBlockRangeEndIndex(anchorBlockId, context);
  const sourceWindowStartBlockId = isListItemContext
    ? startBlockId
    : renderStartBlockId;
  const sourceWindowEndBlockId = isListItemContext
    ? listContextWindowEnd.blockId
    : undefined;

  return buildSourceWindowFromRange({
    backlinkBlockNode,
    context,
    anchorBlockId,
    startIndex,
    endIndex,
    startBlockId: sourceWindowStartBlockId,
    endBlockId: sourceWindowEndBlockId,
    visibleBlockIds: boundaryBlockIds,
    renderMode: "scroll",
  });
}

function buildExtendedBacklinkSourceWindow(backlinkBlockNode, context) {
  const focusBlockId = backlinkBlockNode.block.id;
  const listItemAnchorBlockId = resolveListItemAnchorBlockId(backlinkBlockNode, context);
  const anchorBlockId = listItemAnchorBlockId || focusBlockId;
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
      anchorBlockId,
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
    const firstHeadingIndex = findFirstHeadingIndex(context.orderedDocumentBlocks);
    if (firstHeadingIndex >= 0) {
      safeStartIndex = 0;
      safeEndIndex = Math.max(0, firstHeadingIndex - 1);
      return buildSourceWindowFromRange({
        backlinkBlockNode,
        context,
        anchorBlockId,
        startIndex: safeStartIndex,
        endIndex: safeEndIndex,
        renderMode: "scroll",
      });
    }

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
      safeEndIndex = context.orderedDocumentBlocks.length - 1;
    }
  }

  return buildSourceWindowFromRange({
    backlinkBlockNode,
    context,
    anchorBlockId,
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

  const incompleteRootIdArray = Array.from(orderedBlocksByRootId.entries())
    .filter(([, blockArray]) => !hasCompleteDocumentOrder(blockArray, indexMap))
    .map(([rootId]) => rootId);
  const kramdownOrderMapByRootId = await getKramdownOrderMapByRootId(
    incompleteRootIdArray,
    { getBlockKramdown },
  );

  for (const [rootId, blockArray] of orderedBlocksByRootId.entries()) {
    const hasFullDocumentOrder = hasCompleteDocumentOrder(blockArray, indexMap);
    if (hasFullDocumentOrder) {
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
