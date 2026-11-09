export function mountOrUpdateDocumentBottomBacklinkHost({
  documentContentElement,
  rootId,
  focusBlockId = null,
  panelBacklinkViewExpand = true,
  resolvePanelInstance,
  updatePanelProps,
  destroyExistingHost,
  mountNewHost,
} = {}) {
  if (!documentContentElement || !rootId) {
    return;
  }

  const backlinkPanelBottomElement = documentContentElement.querySelector(
    ".backlink-panel-document-bottom__area",
  );
  if (backlinkPanelBottomElement) {
    const panelRootId = backlinkPanelBottomElement.getAttribute("data-root-id");
    if (panelRootId == rootId) {
      const panelId = backlinkPanelBottomElement.getAttribute("misuzu-backlink-panel-id");
      const panelInstance = resolvePanelInstance?.(panelId);
      updatePanelProps?.({
        panelInstance,
        rootId,
        focusBlockId,
        currentTab: null,
        panelBacklinkViewExpand,
      });
      return {
        action: "update",
        panelElement: backlinkPanelBottomElement,
      };
    }

    destroyExistingHost?.(documentContentElement);
  }

  mountNewHost?.(documentContentElement, rootId, focusBlockId);
  return {
    action: "mount",
    panelElement: null,
  };
}
