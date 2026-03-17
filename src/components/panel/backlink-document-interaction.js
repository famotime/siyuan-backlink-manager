export const BACKLINK_DOCUMENT_RENDER_CONFIG = {
  background: false,
  title: false,
  gutter: true,
  scroll: false,
  breadcrumb: false,
};

const BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER = [
  "core",
  "nearby",
  "extended",
  "full",
];

export function getBacklinkDocumentClickAction({
  ctrlKey = false,
  targetRole = "other",
} = {}) {
  if (targetRole === "toggle") {
    return "toggle-fold";
  }

  if (targetRole === "title") {
    return "open-block";
  }

  return "noop";
}

export function getBacklinkDocumentOpenArea({
  trigger = "click",
  ctrlKey = false,
  targetRole = "other",
} = {}) {
  if (targetRole !== "title") {
    return null;
  }

  if (trigger === "click" && ctrlKey) {
    return "focus";
  }

  if (trigger === "click") {
    return "main";
  }

  if (trigger === "contextmenu") {
    return "right";
  }

  return null;
}

export function shouldHandleBacklinkDocumentClick({
  targetRole = "other",
} = {}) {
  return targetRole !== "toggle";
}

function getBacklinkSourceWindowByLevel(activeBacklink, visibilityLevel = "core") {
  if (!activeBacklink) {
    return null;
  }

  const sourceWindows = activeBacklink.sourceWindows;
  if (sourceWindows && sourceWindows[visibilityLevel]) {
    return sourceWindows[visibilityLevel];
  }

  if (visibilityLevel === "extended") {
    return activeBacklink.sourceWindow || null;
  }

  return null;
}
function getBacklinkSourceWindowRenderMode(
  sourceWindow = null,
  visibilityLevel = "core",
) {
  if (sourceWindow?.renderMode) {
    return sourceWindow.renderMode;
  }

  return "scroll";
}

export function buildBacklinkDocumentRenderOptions({
  documentId,
  activeBacklink,
  contextVisibilityLevel = "core",
  showFullDocument = false,
  deps = {},
} = {}) {
  const normalizedVisibilityLevel =
    BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.includes(contextVisibilityLevel)
      ? contextVisibilityLevel
      : "core";
  const useFullDocument =
    showFullDocument || normalizedVisibilityLevel === "full";
  const options = {
    blockId: documentId,
    render: { ...BACKLINK_DOCUMENT_RENDER_CONFIG },
  };

  if (useFullDocument) {
    options.action = ["cb-get-all"];
  }

  const sourceWindow = getBacklinkSourceWindowByLevel(
    activeBacklink,
    normalizedVisibilityLevel,
  );
  const sourceWindowRenderMode = getBacklinkSourceWindowRenderMode(
    sourceWindow,
    normalizedVisibilityLevel,
  );
  if (!useFullDocument && normalizedVisibilityLevel === "core" && sourceWindow) {
    if (sourceWindowRenderMode === "document") {
      return options;
    }

    const shouldRenderListItemSourceWindow =
      sourceWindow.anchorBlockId &&
      sourceWindow.focusBlockId &&
      sourceWindow.anchorBlockId !== sourceWindow.focusBlockId;
    if (shouldRenderListItemSourceWindow) {
      options.scrollAttr = {
        rootId: sourceWindow.rootId || documentId,
        startId: sourceWindow.startBlockId,
        endId: sourceWindow.endBlockId,
        scrollTop: 0,
        focusId: sourceWindow.focusBlockId || activeBacklink.backlinkBlock?.id,
        zoomInId:
          sourceWindow.anchorBlockId ||
          sourceWindow.focusBlockId ||
          activeBacklink.backlinkBlock?.id,
      };
      return options;
    }

    options.blockId =
      sourceWindow.anchorBlockId ||
      sourceWindow.focusBlockId ||
      activeBacklink?.backlinkBlock?.id ||
      documentId;
    return options;
  }
  if (!useFullDocument && sourceWindow && sourceWindowRenderMode === "document") {
    return options;
  }
  if (!useFullDocument && sourceWindow) {
    options.scrollAttr = {
      rootId: sourceWindow.rootId || documentId,
      startId: sourceWindow.startBlockId,
      endId: sourceWindow.endBlockId,
      scrollTop: 0,
      focusId: sourceWindow.focusBlockId || activeBacklink.backlinkBlock?.id,
      zoomInId:
        sourceWindow.anchorBlockId ||
        sourceWindow.focusBlockId ||
        activeBacklink.backlinkBlock?.id,
      };
    return options;
  }

  if (!useFullDocument && activeBacklink) {
    options.backlinkData = [activeBacklink];
  }

  return options;
}

export function getNextBacklinkContextVisibilityLevel(level = "core") {
  const currentIndex = BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.includes(level)
    ? BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.indexOf(level)
    : 0;
  const nextIndex = Math.min(
    currentIndex + 1,
    BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.length - 1,
  );
  return BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER[nextIndex];
}

export function getPreviousBacklinkContextVisibilityLevel(level = "core") {
  const currentIndex = BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.includes(level)
    ? BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.indexOf(level)
    : 0;
  const previousIndex = Math.max(currentIndex - 1, 0);
  return BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER[previousIndex];
}

export function getBacklinkDocumentTargetRole(target) {
  if (
    !target ||
    typeof target.closest !== "function" ||
    !target.classList ||
    typeof target.classList.contains !== "function"
  ) {
    return "other";
  }

  if (
    target.closest(".b3-list-item__toggle") ||
    target.classList.contains("b3-list-item__arrow")
  ) {
    return "toggle";
  }

  if (target.closest(".b3-list-item__text")) {
    return "title";
  }

  return "other";
}
