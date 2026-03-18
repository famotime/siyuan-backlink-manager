export function isDescendantBlock(
  block = null,
  ancestorBlockId = "",
  blockById = new Map(),
) {
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

export function findBlockSubtreeEndIndex(startIndex, context) {
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

export function getBlockRangeEndIndex(blockId = "", context) {
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

export function resolveListItemAnchorBlockId(backlinkBlockNode = {}, context) {
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

export function getMaxIndexedBlockEntry(
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

export function dedupeBlockIdArray(blockIdArray = []) {
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

export function orderBlockIdsByWindowOrder(windowBlockIds = [], blockIds = []) {
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

export function getHeadingLevel(block = {}) {
  if (block?.type !== "h") {
    return Number.POSITIVE_INFINITY;
  }

  const headingMatch = String(block?.subtype ?? "").match(/^h([1-6])$/i);
  if (!headingMatch) {
    return 6;
  }

  return Number(headingMatch[1]);
}

export function findContainingHeadingStartIndex(
  focusIndex,
  orderedDocumentBlocks = [],
) {
  for (let currentIndex = focusIndex; currentIndex >= 0; currentIndex -= 1) {
    if (orderedDocumentBlocks[currentIndex]?.type === "h") {
      return currentIndex;
    }
  }
  return -1;
}

export function findSectionEndIndexByHeadingStart(
  startIndex,
  orderedDocumentBlocks = [],
) {
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

export function findFirstHeadingIndex(orderedDocumentBlocks = []) {
  for (let currentIndex = 0; currentIndex < orderedDocumentBlocks.length; currentIndex += 1) {
    if (orderedDocumentBlocks[currentIndex]?.type === "h") {
      return currentIndex;
    }
  }
  return -1;
}

export function isStructuralContainerBlock(block = {}) {
  return block?.type === "l" || block?.type === "i";
}

export function resolveTopLevelStructuralContainerBlockId(
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

export function getDirectChildBlocks(parentBlockId = "", context) {
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

export function getSiblingBlockIdByOffset(blockId = "", offset = 0, context) {
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

export function findNearestSiblingBlockIdByPredicate(
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

export function resolveReadableListItemShellBlockIds(listItemBlockId = "", context) {
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

export function resolveReadableStructuralUnit(blockId = "", context) {
  if (!blockId) {
    return {
      startBlockId: "",
      endBlockId: "",
      startIndex: undefined,
      endIndex: undefined,
      visibleBlockIds: [],
    };
  }

  const startIndex = context.indexById.get(blockId);
  if (startIndex === undefined) {
    return {
      startBlockId: blockId,
      endBlockId: blockId,
      startIndex: undefined,
      endIndex: undefined,
      visibleBlockIds: [blockId],
    };
  }

  const block = context.blockById.get(blockId);
  if (!block?.id) {
    return {
      startBlockId: blockId,
      endBlockId: blockId,
      startIndex,
      endIndex: startIndex,
      visibleBlockIds: [blockId],
    };
  }

  if (block.type === "i") {
    const visibleBlockIds = resolveReadableListItemShellBlockIds(blockId, context);
    const {
      index: endIndex,
      blockId: endBlockId,
    } = getMaxIndexedBlockEntry(visibleBlockIds, context, startIndex, blockId);
    return {
      startBlockId: blockId,
      endBlockId: endBlockId || blockId,
      startIndex,
      endIndex: Number.isFinite(endIndex) ? endIndex : startIndex,
      visibleBlockIds,
    };
  }

  if (block.type === "l") {
    const visibleBlockIds = [blockId];
    const firstChildListItem = getDirectChildBlocks(blockId, context).find(
      (childBlock) => childBlock?.type === "i",
    );
    if (firstChildListItem?.id) {
      visibleBlockIds.push(
        ...resolveReadableListItemShellBlockIds(firstChildListItem.id, context),
      );
    }
    const dedupedVisibleBlockIds = dedupeBlockIdArray(visibleBlockIds);
    const {
      index: endIndex,
      blockId: endBlockId,
    } = getMaxIndexedBlockEntry(
      dedupedVisibleBlockIds,
      context,
      startIndex,
      blockId,
    );
    return {
      startBlockId: blockId,
      endBlockId: endBlockId || blockId,
      startIndex,
      endIndex: Number.isFinite(endIndex) ? endIndex : startIndex,
      visibleBlockIds: dedupedVisibleBlockIds,
    };
  }

  return {
    startBlockId: blockId,
    endBlockId: blockId,
    startIndex,
    endIndex: startIndex,
    visibleBlockIds: [blockId],
  };
}

export function findNearestNonHeadingIndex(focusIndex, orderedDocumentBlocks = []) {
  for (let currentIndex = focusIndex - 1; currentIndex >= 0; currentIndex -= 1) {
    if (orderedDocumentBlocks[currentIndex]?.type !== "h") {
      return currentIndex;
    }
  }
  return -1;
}
