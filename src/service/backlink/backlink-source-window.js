import {
  dedupeBlockIdArray,
} from "./backlink-source-window-structure.js";
import {
  generateBacklinkSourceWindowBlockArraySql,
  loadOrderedBacklinkSourceWindowBlocks,
} from "./backlink-source-window-loader.js";
import {
  buildBacklinkSourceWindow,
} from "./backlink-source-window-planner.js";

export {
  generateBacklinkSourceWindowBlockArraySql,
  loadOrderedBacklinkSourceWindowBlocks,
  buildBacklinkSourceWindow,
};

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
    ...(identity.zoomInBlockId || sourceWindow.zoomInBlockId
      ? { zoomInBlockId: identity.zoomInBlockId || sourceWindow.zoomInBlockId }
      : {}),
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

export function getBacklinkSourceWindowCandidateBlockIds({
  backlinkBlockId = "",
  sourceWindow = null,
} = {}) {
  /** @type {Object<string, any>} */
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

/**
 * 将三个可见级别的来源窗口挂载到反链块节点与反链数据上。
 * 可见级别在内部固定为 core/nearby/extended 三档，一次性构建完成。
 * @param {Object} [options] 参数对象
 * @param {Array<Object>} [options.backlinkDataArray] 反链数据数组
 * @param {Array<Object>} [options.backlinkBlockNodeArray] 反链块节点数组
 * @param {Map<string, Array<Object>>} [options.orderedBlocksByRootId] 按文档真实顺序组织的文档块（rootId -> 块数组）
 * @returns {Array<Object>} 原样返回 backlinkDataArray（已就地挂载 sourceWindows/sourceWindow/sourceDocumentOrder）
 */
export function attachBacklinkSourceWindows({
  backlinkDataArray = [],
  backlinkBlockNodeArray = [],
  orderedBlocksByRootId = new Map(),
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
