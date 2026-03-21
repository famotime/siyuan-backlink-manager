import {
  dedupeBlockIdArray,
  resolveReadableListItemShellBlockIds,
  resolveReadableStructuralUnit,
} from "./backlink-source-window-structure.js";
import {
  generateBacklinkSourceWindowBlockArraySql,
  loadOrderedBacklinkSourceWindowBlocks,
} from "./backlink-source-window-loader.js";
import {
  buildBacklinkSourceWindow,
  buildCoreBacklinkSourceWindow,
  buildExtendedBacklinkSourceWindow,
  buildNearbyBacklinkSourceWindow,
} from "./backlink-source-window-planner.js";
import {
  buildDocumentBlockContext,
  getBlockDocumentOrder,
} from "./backlink-source-window-ordering.js";

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
  planner: {
    buildCoreBacklinkSourceWindow,
    buildNearbyBacklinkSourceWindow,
    buildExtendedBacklinkSourceWindow,
  },
};
