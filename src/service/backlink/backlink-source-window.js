import {
  buildDocumentBlockContext,
  getBlockDocumentOrder,
} from "./backlink-source-window-ordering.js";
import {
  dedupeBlockIdArray,
  findBlockSubtreeEndIndex,
  findContainingHeadingStartIndex,
  findFirstHeadingIndex,
  findNearestNonHeadingIndex,
  findNearestSiblingBlockIdByPredicate,
  findSectionEndIndexByHeadingStart,
  getBlockRangeEndIndex,
  getMaxIndexedBlockEntry,
  getSiblingBlockIdByOffset,
  isStructuralContainerBlock,
  orderBlockIdsByWindowOrder,
  resolveListItemAnchorBlockId,
  resolveReadableListItemShellBlockIds,
  resolveReadableStructuralUnit,
  resolveTopLevelStructuralContainerBlockId,
} from "./backlink-source-window-structure.js";
import {
  generateBacklinkSourceWindowBlockArraySql,
  loadOrderedBacklinkSourceWindowBlocks,
} from "./backlink-source-window-loader.js";

export {
  generateBacklinkSourceWindowBlockArraySql,
  loadOrderedBacklinkSourceWindowBlocks,
};

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

  const startUnit = isListItemContext
    ? resolveReadableStructuralUnit(startBlockId, context)
    : resolveReadableStructuralUnit(startBlockId || anchorBlockId, context);
  const endUnit = isListItemContext
    ? resolveReadableStructuralUnit(endBlockId, context)
    : resolveReadableStructuralUnit(endBlockId || anchorBlockId, context);
  const startIndex = isListItemContext
    ? context.indexById.get(startBlockId) ??
      context.indexById.get(anchorBlockId) ??
      anchorStartIndex
    : startUnit.startIndex ?? anchorStartIndex;
  const boundaryBlockIds = isListItemContext
    ? dedupeBlockIdArray([
        ...startUnit.visibleBlockIds,
        anchorBlockId,
        backlinkBlockNode.block.id,
        ...endUnit.visibleBlockIds,
      ])
    : dedupeBlockIdArray([
        ...startUnit.visibleBlockIds,
        backlinkBlockNode.block.id,
        ...endUnit.visibleBlockIds,
      ]);
  const listContextWindowEnd = getMaxIndexedBlockEntry(
    boundaryBlockIds,
    context,
    anchorStartIndex,
    anchorBlockId,
  );
  const endIndex = isListItemContext
    ? listContextWindowEnd.index
    : endUnit.endIndex ?? anchorStartIndex;
  const sourceWindowStartBlockId = isListItemContext
    ? startBlockId
    : startUnit.startBlockId || anchorBlockId;
  const sourceWindowEndBlockId = isListItemContext
    ? listContextWindowEnd.blockId
    : endUnit.endBlockId || anchorBlockId;

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
    let safeStartIndex = focusIndex;
    const previousContentIndex = findNearestNonHeadingIndex(
      focusIndex,
      context.orderedDocumentBlocks,
    );
    if (previousContentIndex >= 0) {
      const previousSectionHeadingStartIndex = findContainingHeadingStartIndex(
        previousContentIndex,
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

export const __internal = {
  ordering: {
    buildDocumentBlockContext,
    getBlockDocumentOrder,
  },
  structure: {
    resolveReadableStructuralUnit,
    resolveReadableListItemShellBlockIds,
  },
};
