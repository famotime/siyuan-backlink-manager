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
  if (ctrlKey) {
    return "open-block";
  }

  if (targetRole === "toggle") {
    return "toggle-fold";
  }

  return "noop";
}

export function shouldHandleBacklinkDocumentClick({
  targetRole = "other",
} = {}) {
  return targetRole !== "toggle";
}

export function buildBacklinkDocumentRenderOptions({
  documentId,
  activeBacklink,
  contextVisibilityLevel = "core",
  showFullDocument = false,
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
