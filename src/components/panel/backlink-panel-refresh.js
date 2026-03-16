import { getActiveBacklinkDocumentMainAreaTabElement } from "./backlink-document-open-target.js";

export function queryDocumentRootIdByTabDataId(
  tabDataId = "",
  documentRef = globalThis.document,
) {
  if (!tabDataId || !documentRef?.querySelector) {
    return "";
  }

  const protyleElement = documentRef.querySelector(
    `.layout-tab-container.fn__flex-1 > div.protyle[data-id="${tabDataId}"]`,
  );
  const titleElement = protyleElement?.querySelector?.(".protyle-title");
  return titleElement?.getAttribute?.("data-node-id") || "";
}

export function resolveBacklinkPanelRefreshRootId({
  currentTab = null,
  fallbackRootId = "",
  fallbackLastViewedDocId = "",
  deps = {},
} = {}) {
  const getMainAreaTabElement =
    deps.getActiveBacklinkDocumentMainAreaTabElement ||
    getActiveBacklinkDocumentMainAreaTabElement;
  const resolveRootIdByTabDataId =
    deps.queryDocumentRootIdByTabDataId || queryDocumentRootIdByTabDataId;

  const mainAreaTabElement = getMainAreaTabElement({
    currentTab,
    windowRef: deps.windowRef || globalThis.window,
  });
  const mainAreaTabDataId =
    mainAreaTabElement?.getAttribute?.("data-id") || "";
  const mainAreaRootId = resolveRootIdByTabDataId(
    mainAreaTabDataId,
    deps.documentRef || globalThis.document,
  );

  if (mainAreaRootId) {
    return mainAreaRootId;
  }
  if (fallbackLastViewedDocId) {
    return fallbackLastViewedDocId;
  }
  return fallbackRootId || "";
}
