import {
  getBacklinkSourceWindowByLevel,
  getBacklinkSourceWindowBodyRange,
  getBacklinkSourceWindowIdentity,
  getBacklinkSourceWindowOrderedVisibleBlockIds,
} from "../../service/backlink/backlink-source-window.js";

const BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER = [
  "core",
  "nearby",
  "extended",
  "full",
];

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
  jumpToBreadcrumbBlockInPreview,
  getBacklinkSourceWindowByLevel: getBacklinkSourceWindowByLevelDep =
    getBacklinkSourceWindowByLevel,
  getBacklinkSourceWindowOrderedVisibleBlockIds:
    getBacklinkSourceWindowOrderedVisibleBlockIdsDep =
      getBacklinkSourceWindowOrderedVisibleBlockIds,
  getBacklinkSourceWindowBodyRange: getBacklinkSourceWindowBodyRangeDep =
    getBacklinkSourceWindowBodyRange,
  getBacklinkSourceWindowIdentity: getBacklinkSourceWindowIdentityDep =
    getBacklinkSourceWindowIdentity,
} = {}) {
  function canNavigateBreadcrumbBlockAtLevel(
    activeBacklink,
    blockId = "",
    contextVisibilityLevel = "core",
    documentId = "",
  ) {
    if (!activeBacklink || !blockId) {
      return false;
    }
    if (blockId === documentId) {
      return contextVisibilityLevel === "full";
    }
    if (blockId === activeBacklink?.backlinkBlock?.id) {
      return true;
    }

    const sourceWindow = getBacklinkSourceWindowByLevelDep(
      activeBacklink,
      contextVisibilityLevel,
    );
    if (!sourceWindow) {
      return false;
    }

    const visibleBlockIdSet = new Set([
      ...getBacklinkSourceWindowOrderedVisibleBlockIdsDep(sourceWindow),
      ...(getBacklinkSourceWindowBodyRangeDep(sourceWindow)?.windowBlockIds || []),
      getBacklinkSourceWindowIdentityDep(sourceWindow)?.anchorBlockId || "",
      getBacklinkSourceWindowIdentityDep(sourceWindow)?.focusBlockId || "",
      getBacklinkSourceWindowIdentityDep(sourceWindow)?.zoomInBlockId || "",
    ]);
    visibleBlockIdSet.delete("");
    return visibleBlockIdSet.has(blockId);
  }

  function resolveBacklinkBreadcrumbVisibilityLevel(
    activeBacklink,
    blockId = "",
    currentVisibilityLevel = "core",
    documentId = "",
  ) {
    const startIndex = Math.max(
      BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.indexOf(currentVisibilityLevel),
      0,
    );

    for (
      let index = startIndex;
      index < BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.length;
      index += 1
    ) {
      const level = BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER[index];
      if (
        canNavigateBreadcrumbBlockAtLevel(
          activeBacklink,
          blockId,
          level,
          documentId,
        )
      ) {
        return level;
      }
    }

    return "full";
  }

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

  function navigateBacklinkBreadcrumb(documentLiElement, blockId = "") {
    if (!documentLiElement || !blockId) {
      return false;
    }

    const documentId = documentLiElement.getAttribute("data-node-id");
    if (!documentId) {
      return false;
    }

    expandBacklinkDocument(documentLiElement);
    const editorElement = documentLiElement.nextElementSibling;
    const editor = state.backlinkDocumentEditorMap?.get?.(documentId);
    const protyleContentElement =
      editor?.protyle?.contentElement || editorElement;
    if (!protyleContentElement || typeof jumpToBreadcrumbBlockInPreview !== "function") {
      return false;
    }

    if (
      jumpToBreadcrumbBlockInPreview(protyleContentElement, blockId, {
        documentId,
      })
    ) {
      return true;
    }

    const documentGroup = state.backlinkDocumentGroupArray.find(
      (group) => group.documentId === documentId,
    );
    const activeBacklink = documentGroup?.activeBacklink || null;
    if (!activeBacklink) {
      return false;
    }

    const currentVisibilityLevel = getBacklinkDocumentRenderState(
      state.backlinkDocumentViewState,
      documentId,
    ).contextVisibilityLevel;
    const targetVisibilityLevel = resolveBacklinkBreadcrumbVisibilityLevel(
      activeBacklink,
      blockId,
      currentVisibilityLevel,
      documentId,
    );
    if (targetVisibilityLevel !== currentVisibilityLevel) {
      markBacklinkDocumentVisibilityLevel(
        state.backlinkDocumentViewState,
        documentId,
        targetVisibilityLevel,
      );
      refreshBacklinkDocumentGroupById(documentId, {
        documentLiElement,
        editorElement,
      });
    }

    const refreshedEditor = state.backlinkDocumentEditorMap?.get?.(documentId);
    const refreshedContentElement =
      refreshedEditor?.protyle?.contentElement || editorElement;
    if (!refreshedContentElement) {
      return false;
    }

    return Boolean(
      jumpToBreadcrumbBlockInPreview(refreshedContentElement, blockId, {
        documentId,
      }),
    );
  }

  return {
    navigateBacklinkDocument,
    stepBacklinkDocumentContext,
    navigateBacklinkBreadcrumb,
  };
}
