import {
  getBacklinkSourceWindowBodyRange,
  getBacklinkSourceWindowByLevel,
  getBacklinkSourceWindowIdentity,
} from "../../service/backlink/backlink-source-window.js";

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
    const sourceWindowIdentity = getBacklinkSourceWindowIdentity(sourceWindow) || {};
    if (sourceWindowRenderMode === "document") {
      return options;
    }

    const shouldRenderListItemSourceWindow =
      sourceWindowIdentity.anchorBlockId &&
      sourceWindowIdentity.focusBlockId &&
      sourceWindowIdentity.anchorBlockId !== sourceWindowIdentity.focusBlockId;
    const bodyRange = getBacklinkSourceWindowBodyRange(sourceWindow);
    if (shouldRenderListItemSourceWindow) {
      options.scrollAttr = {
        rootId: sourceWindowIdentity.rootId || documentId,
        startId: bodyRange?.startBlockId || "",
        endId: bodyRange?.endBlockId || "",
        scrollTop: 0,
        focusId: sourceWindowIdentity.focusBlockId || activeBacklink.backlinkBlock?.id,
        zoomInId:
          sourceWindowIdentity.zoomInBlockId ||
          sourceWindowIdentity.anchorBlockId ||
          sourceWindowIdentity.focusBlockId ||
          activeBacklink.backlinkBlock?.id,
      };
      return options;
    }

    options.blockId =
      sourceWindowIdentity.anchorBlockId ||
      sourceWindowIdentity.focusBlockId ||
      activeBacklink?.backlinkBlock?.id ||
      documentId;
    return options;
  }
  if (!useFullDocument && sourceWindow && sourceWindowRenderMode === "document") {
    return options;
  }
  if (!useFullDocument && sourceWindow) {
    const sourceWindowIdentity = getBacklinkSourceWindowIdentity(sourceWindow) || {};
    const bodyRange = getBacklinkSourceWindowBodyRange(sourceWindow);
    const scrollAttr = {
      rootId: sourceWindowIdentity.rootId || documentId,
      startId: bodyRange?.startBlockId || "",
      endId: bodyRange?.endBlockId || "",
      scrollTop: 0,
      focusId: sourceWindowIdentity.focusBlockId || activeBacklink.backlinkBlock?.id,
    };
    if (normalizedVisibilityLevel !== "nearby") {
      scrollAttr.zoomInId =
        sourceWindowIdentity.zoomInBlockId ||
        sourceWindowIdentity.anchorBlockId ||
        sourceWindowIdentity.focusBlockId ||
        activeBacklink.backlinkBlock?.id;
    }
    options.scrollAttr = scrollAttr;
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
