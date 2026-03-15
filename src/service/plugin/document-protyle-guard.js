export function shouldIgnoreDocumentBottomBacklinkForProtyle(
  contentElement,
  deps = {},
) {
  const hasClosestByClassName = deps.hasClosestByClassName;
  if (typeof hasClosestByClassName !== "function" || !contentElement) {
    return false;
  }

  if (hasClosestByClassName(contentElement, "backlink-panel__area")) {
    return true;
  }

  if (
    hasClosestByClassName(contentElement, "backlink-panel-document-bottom__area")
  ) {
    return true;
  }

  return false;
}
