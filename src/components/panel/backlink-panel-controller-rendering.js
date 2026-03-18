export function createBacklinkPreviewRenderCoordinator({
  state,
  clearBacklinkProtyleList,
  batchCreateOfficialBacklinkProtyle,
  findBacklinkDocumentRenderTargets,
  renderBacklinkDocumentGroup,
  groupBacklinksByDocument,
} = {}) {
  function refreshBacklinkPreview() {
    clearBacklinkProtyleList();
    if (!state.backlinkFilterPanelRenderData) {
      return;
    }

    batchCreateOfficialBacklinkProtyle(
      state.backlinkFilterPanelRenderData.backlinkDocumentArray,
      state.backlinkFilterPanelRenderData.backlinkDataArray,
    );

    state.displayHintBacklinkBlockCacheUsage = Boolean(
      state.backlinkFilterPanelRenderData.usedCache,
    );
  }

  function refreshBacklinkDocumentGroupById(
    documentId,
    {
      documentLiElement = null,
      editorElement = null,
    } = {},
  ) {
    if (!documentId || !state.backlinkFilterPanelRenderData) {
      return null;
    }

    const renderTargets = documentLiElement && editorElement
      ? { documentLiElement, editorElement }
      : findBacklinkDocumentRenderTargets(documentId);
    if (!renderTargets.documentLiElement || !renderTargets.editorElement) {
      return null;
    }
    const targetDocumentLiElement = renderTargets.documentLiElement;
    const targetEditorElement = renderTargets.editorElement;

    state.backlinkDocumentGroupArray = groupBacklinksByDocument(
      state.backlinkFilterPanelRenderData.backlinkDocumentArray,
      state.backlinkFilterPanelRenderData.backlinkDataArray,
      state.backlinkDocumentActiveIndexMap,
    );

    const nextDocumentGroup = state.backlinkDocumentGroupArray.find(
      (group) => group.documentId === documentId,
    );
    if (!nextDocumentGroup) {
      return null;
    }

    renderBacklinkDocumentGroup(
      nextDocumentGroup,
      targetDocumentLiElement,
      targetEditorElement,
    );
    return nextDocumentGroup;
  }

  return {
    refreshBacklinkPreview,
    refreshBacklinkDocumentGroupById,
  };
}
