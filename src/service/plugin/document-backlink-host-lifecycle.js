export function mountOrUpdateDocumentBottomBacklinkHost({
  docuemntContentElement,
  rootId,
  focusBlockId = null,
  panelBacklinkViewExpand = true,
  resolvePanelInstance,
  updatePanelProps,
  destroyExistingHost,
  mountNewHost,
} = {}) {
  if (!docuemntContentElement || !rootId) {
    return;
  }

  const backlinkPanelBottomElement = docuemntContentElement.querySelector(
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

    destroyExistingHost?.(docuemntContentElement);
  }

  mountNewHost?.(docuemntContentElement, rootId, focusBlockId);
  return {
    action: "mount",
    panelElement: null,
  };
}
