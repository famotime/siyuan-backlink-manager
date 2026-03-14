export const BACKLINK_DOCUMENT_RENDER_CONFIG = {
  background: false,
  title: false,
  gutter: true,
  scroll: false,
  breadcrumb: false,
};

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

  if (targetRole === "title") {
    return "show-full-document";
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
  showFullDocument = false,
} = {}) {
  const options = {
    blockId: documentId,
    render: { ...BACKLINK_DOCUMENT_RENDER_CONFIG },
  };

  if (!showFullDocument && activeBacklink) {
    options.backlinkData = [activeBacklink];
  }

  return options;
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
