const BACKLINK_DOCUMENT_VISIBILITY_LEVELS = [
  "core",
  "nearby",
  "extended",
  "full",
];

function normalizeBacklinkDocumentVisibilityLevel(level) {
  if (BACKLINK_DOCUMENT_VISIBILITY_LEVELS.includes(level)) {
    return level;
  }
  return "core";
}

export function createBacklinkDocumentViewState() {
  return {
    documentFoldMap: new Map(),
    documentShowFullMap: new Map(),
    documentVisibilityLevelMap: new Map(),
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
  markBacklinkDocumentVisibilityLevel(state, documentId, "full");
}

export function markBacklinkDocumentVisibilityLevel(state, documentId, level) {
  if (!state || !documentId) {
    return;
  }

  const normalizedLevel = normalizeBacklinkDocumentVisibilityLevel(level);
  state.documentVisibilityLevelMap.set(documentId, normalizedLevel);
  if (normalizedLevel === "full") {
    state.documentShowFullMap.set(documentId, true);
  } else {
    state.documentShowFullMap.delete(documentId);
  }
  markBacklinkDocumentExpanded(state.documentFoldMap, documentId);
}

export function advanceBacklinkDocumentVisibilityLevel(state, documentId) {
  if (!state || !documentId) {
    return "core";
  }

  const currentLevel = normalizeBacklinkDocumentVisibilityLevel(
    state.documentVisibilityLevelMap?.get(documentId),
  );
  const nextLevelIndex = Math.min(
    BACKLINK_DOCUMENT_VISIBILITY_LEVELS.indexOf(currentLevel) + 1,
    BACKLINK_DOCUMENT_VISIBILITY_LEVELS.length - 1,
  );
  const nextLevel = BACKLINK_DOCUMENT_VISIBILITY_LEVELS[nextLevelIndex];
  markBacklinkDocumentVisibilityLevel(state, documentId, nextLevel);
  return nextLevel;
}

export function cycleBacklinkDocumentVisibilityLevel(
  state,
  documentId,
  direction = "next",
) {
  if (!state || !documentId) {
    return "core";
  }

  const currentLevel = normalizeBacklinkDocumentVisibilityLevel(
    state.documentVisibilityLevelMap?.get(documentId),
  );
  const currentIndex = BACKLINK_DOCUMENT_VISIBILITY_LEVELS.indexOf(currentLevel);
  const nextIndex =
    direction === "previous"
      ? Math.max(currentIndex - 1, 0)
      : Math.min(currentIndex + 1, BACKLINK_DOCUMENT_VISIBILITY_LEVELS.length - 1);
  const nextLevel = BACKLINK_DOCUMENT_VISIBILITY_LEVELS[nextIndex];
  markBacklinkDocumentVisibilityLevel(state, documentId, nextLevel);
  return nextLevel;
}

export function getBacklinkDocumentRenderState(state, documentId) {
  const contextVisibilityLevel = normalizeBacklinkDocumentVisibilityLevel(
    state?.documentVisibilityLevelMap?.get(documentId),
  );
  const showFullDocument =
    state?.documentShowFullMap?.get(documentId) === true ||
    contextVisibilityLevel === "full";
  return {
    isFolded: state?.documentFoldMap?.get(documentId) === true,
    contextVisibilityLevel,
    showFullDocument,
    activeIndex: state?.documentActiveIndexMap?.get(documentId) ?? 0,
  };
}
