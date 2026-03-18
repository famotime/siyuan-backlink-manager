export function createBacklinkPanelNavigationActions({
  state,
  getCyclicBacklinkIndex,
  isArrayEmpty,
  cycleBacklinkDocumentVisibilityLevel,
  markBacklinkDocumentVisibilityLevel,
  getBacklinkDocumentRenderState,
  markBacklinkDocumentFullView,
  expandBacklinkDocument,
  refreshBacklinkDocumentGroupById,
} = {}) {
  function navigateBacklinkDocument(event, direction) {
    event.preventDefault();

    const target = event.currentTarget;
    const documentLiElement = target.closest(".list-item__document-name");
    if (!documentLiElement) {
      return;
    }

    const documentId = documentLiElement.getAttribute("data-node-id");
    const documentGroup = state.backlinkDocumentGroupArray.find(
      (group) => group.documentId === documentId,
    );
    if (!documentGroup || isArrayEmpty(documentGroup.backlinks)) {
      return;
    }

    const nextIndex = getCyclicBacklinkIndex(
      documentGroup.backlinks.length,
      documentGroup.activeIndex,
      direction,
    );
    state.backlinkDocumentActiveIndexMap.set(documentId, nextIndex);
    refreshBacklinkDocumentGroupById(documentId);
  }

  function stepBacklinkDocumentContext(documentLiElement, direction = "next") {
    if (!documentLiElement) {
      return;
    }

    const documentId = documentLiElement.getAttribute("data-node-id");
    const editorElement = documentLiElement.nextElementSibling;
    if (!documentId || !editorElement) {
      return;
    }

    const nextVisibilityLevel =
      direction === "previous" || direction === "next"
        ? cycleBacklinkDocumentVisibilityLevel(
            state.backlinkDocumentViewState,
            documentId,
            direction,
          )
        : (() => {
            markBacklinkDocumentVisibilityLevel(
              state.backlinkDocumentViewState,
              documentId,
              direction,
            );
            return getBacklinkDocumentRenderState(
              state.backlinkDocumentViewState,
              documentId,
            ).contextVisibilityLevel;
          })();
    expandBacklinkDocument(documentLiElement);

    const documentGroup = state.backlinkDocumentGroupArray.find(
      (group) => group.documentId === documentId,
    );
    if (!documentGroup) {
      return;
    }
    if (nextVisibilityLevel === "full") {
      markBacklinkDocumentFullView(state.backlinkDocumentViewState, documentId);
    }
    refreshBacklinkDocumentGroupById(
      documentId,
      {
        documentLiElement,
        editorElement,
      },
    );
  }

  return {
    navigateBacklinkDocument,
    stepBacklinkDocumentContext,
  };
}
