export function buildBacklinkPanelInitStrategy({
  previousRootId = "",
  rootId = "",
  hasQueryParams = false,
} = {}) {
  const rootChanged = previousRootId !== rootId;

  return {
    rootChanged,
    resetDocumentActiveIndexes: rootChanged,
    reuseExistingQueryParams: !rootChanged && hasQueryParams,
    applyDefaultSelectedViewBlock: rootChanged,
  };
}

export function resolveBacklinkPanelFocusRefresh({
  rootId = "",
  focusBlockId = null,
  protyle = null,
} = {}) {
  const nextRootId = protyle?.block?.rootID || protyle?.block?.rootId || "";
  const nextFocusBlockId = protyle?.block?.id || null;
  const sameRoot = Boolean(rootId) && nextRootId === rootId;
  const focusChanged = Boolean(nextFocusBlockId) && nextFocusBlockId !== focusBlockId;

  return {
    nextRootId,
    nextFocusBlockId,
    shouldRefresh: sameRoot && focusChanged,
  };
}
