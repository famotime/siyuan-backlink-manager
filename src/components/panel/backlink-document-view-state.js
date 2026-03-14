export function createBacklinkDocumentViewState() {
  return {
    documentFoldMap: new Map(),
    documentShowFullMap: new Map(),
    documentActiveIndexMap: new Map(),
  };
}

export function markBacklinkDocumentFoldState(
  documentFoldMap,
  documentId,
  isFolded,
) {
  if (!documentId) {
    return;
  }

  if (isFolded) {
    documentFoldMap.set(documentId, true);
    return;
  }

  documentFoldMap.delete(documentId);
}

export function markBacklinkDocumentExpanded(documentFoldMap, documentId) {
  if (!documentId) {
    return;
  }

  documentFoldMap.delete(documentId);
}

export function markBacklinkDocumentFullView(state, documentId) {
  if (!state || !documentId) {
    return;
  }

  state.documentShowFullMap.set(documentId, true);
  markBacklinkDocumentExpanded(state.documentFoldMap, documentId);
}

export function getBacklinkDocumentRenderState(state, documentId) {
  return {
    isFolded: state?.documentFoldMap?.get(documentId) === true,
    showFullDocument: state?.documentShowFullMap?.get(documentId) === true,
    activeIndex: state?.documentActiveIndexMap?.get(documentId) ?? 0,
  };
}
