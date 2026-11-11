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
  findSectionEndIndexByHeadingStart,
  getMaxIndexedBlockEntry,
  getSiblingBlockIdByOffset,
  isStructuralContainerBlock,
  orderBlockIdsByWindowOrder,
  resolveListItemAnchorBlockId,
  resolveReadableListItemShellBlockIds,
  resolveReadableStructuralUnit,
  resolveTopLevelStructuralContainerBlockId,
} from "./backlink-source-window-structure.js";

/**
 * 构建来源窗口的上下文计划（identity + bodyRange + 可见块集合）。
 * @param {Object} [params] 参数对象
 * @param {string} [params.rootId] 来源文档 ID
 * @param {string} [params.anchorBlockId] 锚点块 ID
 * @param {string} [params.focusBlockId] 聚焦块 ID
 * @param {string} [params.zoomInBlockId] 缩放定位块 ID（列表项上下文）
 * @param {number} [params.sourceDocumentOrder] 反链块在来源文档中的顺序
 * @param {string} [params.startBlockId] 窗口起始块 ID
 * @param {string} [params.endBlockId] 窗口结束块 ID
 * @param {string[]} [params.windowBlockIds] 窗口内全部块 ID
 * @param {string[]} [params.orderedVisibleBlockIds] 按文档顺序排列的可见块 ID
 * @param {Object} [params.context] 文档块上下文（含 blockById 索引）
 * @returns {Object} 上下文计划对象
 */
function buildSourceWindowContextPlan({
  rootId = "",
  anchorBlockId = "",
  focusBlockId = "",
  zoomInBlockId = "",
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
      ...(zoomInBlockId ? { zoomInBlockId } : {}),
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

/**
 * 将上下文计划装配为完整来源窗口对象。
 * @param {Object} [params] 参数对象
 * @param {Object|null} [params.contextPlan] 上下文计划
 * @param {string} [params.renderMode] 渲染模式
 * @param {string} [params.defaultExpandMode] 默认展开模式
 * @returns {Object|null} 来源窗口对象；无计划时返回 null
 */
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
  /** @type {Object<string, any>} */
  const sourceWindow = {
    rootId: identity.rootId || "",
    anchorBlockId: identity.anchorBlockId || "",
    startBlockId: bodyRange.startBlockId || "",
    endBlockId: bodyRange.endBlockId || "",
    focusBlockId: identity.focusBlockId || "",
    ...(identity.zoomInBlockId ? { zoomInBlockId: identity.zoomInBlockId } : {}),
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

/**
 * 按块索引区间构建来源窗口：截取窗口块并计算可见块集合。
 * @param {Object} [params] 参数对象
 * @param {Object|null} [params.backlinkBlockNode] 反链块节点
 * @param {Object} [params.context] 文档块上下文（含 orderedDocumentBlocks/indexById）
 * @param {string} [params.anchorBlockId] 锚点块 ID
 * @param {string} [params.zoomInBlockId] 缩放定位块 ID（列表项上下文）
 * @param {number} [params.startIndex] 窗口起始块索引
 * @param {number} [params.endIndex] 窗口结束块索引
 * @param {string} [params.startBlockId] 窗口起始块 ID
 * @param {string} [params.endBlockId] 窗口结束块 ID
 * @param {string[]} [params.visibleBlockIds] 指定可见块 ID（缺省时窗口内全部可见）
 * @param {string} [params.renderMode] 渲染模式
 * @returns {Object|null} 来源窗口对象；参数不完整或窗口为空时返回 null
 */
function buildSourceWindowFromRange({
  backlinkBlockNode = null,
  context,
  anchorBlockId = "",
  zoomInBlockId = "",
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
    ...(zoomInBlockId ? { zoomInBlockId } : {}),
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

function resolveParentListItemReadableUnit(listItemBlockId = "", context) {
  const listItemBlock = context?.blockById?.get(listItemBlockId);
  const parentListBlock = context?.blockById?.get(listItemBlock?.parent_id);
  if (parentListBlock?.type !== "l") {
    return null;
  }

  const parentListItemBlock = context?.blockById?.get(parentListBlock.parent_id);
  if (parentListItemBlock?.type !== "i") {
    return null;
  }

  return resolveReadableStructuralUnit(parentListItemBlock.id, context);
}

export function buildCoreBacklinkSourceWindow(backlinkBlockNode, context) {
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

export function buildNearbyBacklinkSourceWindow(backlinkBlockNode, context) {
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
      const prevSiblingBlockId = getSiblingBlockIdByOffset(anchorBlockId, -1, context);
      const prevSiblingBlock = context.blockById.get(prevSiblingBlockId);
      if (prevSiblingBlock?.type === "h") {
        // Previous sibling is a heading container. Use the block immediately before
        // the focus heading in flat document order (the last content of the previous
        // heading section), but exclude the empty case where the previous heading
        // has no body content and the flat-previous block is the heading itself.
        const prevFlatBlockId = context.orderedDocumentBlocks[anchorStartIndex - 1]?.id || "";
        startBlockId = prevFlatBlockId !== prevSiblingBlockId ? prevFlatBlockId : "";
      } else {
        startBlockId = prevSiblingBlockId || "";
      }
      endBlockId = context.orderedDocumentBlocks[anchorStartIndex + 1]?.id || "";
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
  const parentListItemUnit = isListItemContext
    ? resolveParentListItemReadableUnit(anchorBlockId, context)
    : null;
  const startIndex = isListItemContext
    ? parentListItemUnit?.startIndex ??
      context.indexById.get(startBlockId) ??
      context.indexById.get(anchorBlockId) ??
      anchorStartIndex
    : startUnit.startIndex ?? anchorStartIndex;
  const boundaryBlockIds = isListItemContext
    ? dedupeBlockIdArray([
        ...(parentListItemUnit?.visibleBlockIds || []),
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
    ? parentListItemUnit?.startBlockId || startBlockId
    : startUnit.startBlockId || anchorBlockId;
  const sourceWindowEndBlockId = isListItemContext
    ? listContextWindowEnd.blockId
    : endUnit.endBlockId || anchorBlockId;

  return buildSourceWindowFromRange({
    backlinkBlockNode,
    context,
    anchorBlockId,
    ...(parentListItemUnit?.startBlockId
      ? { zoomInBlockId: parentListItemUnit.startBlockId }
      : {}),
    startIndex,
    endIndex,
    startBlockId: sourceWindowStartBlockId,
    endBlockId: sourceWindowEndBlockId,
    visibleBlockIds: boundaryBlockIds,
    renderMode: "scroll",
  });
}

export function buildExtendedBacklinkSourceWindow(backlinkBlockNode, context) {
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
