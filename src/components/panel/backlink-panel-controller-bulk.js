import {
  cycleBacklinkContextLevel,
  normalizeBacklinkContextLevel,
} from "./backlink-panel-header.js";
import {
  getBacklinkDocumentRenderState,
  markBacklinkDocumentVisibilityLevel,
} from "./backlink-document-view-state.js";

export function createBacklinkPanelBulkActions({
  state,
  expandBacklinkDocument,
  collapseBacklinkDocument,
  expandAllListItemNode,
  collapseAllListItemNode,
  syHasChildListNode,
  markBacklinkDocumentVisibilityLevel:
    markBacklinkDocumentVisibilityLevelDep = markBacklinkDocumentVisibilityLevel,
  refreshBacklinkDocumentGroupById = () => {},
  getBacklinkDocumentRenderState:
    getBacklinkDocumentRenderStateDep = getBacklinkDocumentRenderState,
  cycleBacklinkContextLevel: cycleBacklinkContextLevelDep =
    cycleBacklinkContextLevel,
} = {}) {
  function setAllBacklinkDocumentContextVisibilityLevel(level = "core") {
    const normalizedLevel = normalizeBacklinkContextLevel(level);
    state.backlinkDocumentViewState.globalContextVisibilityLevel = normalizedLevel;
    if ("backlinkGlobalContextVisibilityLevel" in state) {
      state.backlinkGlobalContextVisibilityLevel = normalizedLevel;
    }

    for (const documentGroup of state.backlinkDocumentGroupArray || []) {
      const documentId = documentGroup?.documentId;
      if (!documentId) {
        continue;
      }

      markBacklinkDocumentVisibilityLevelDep(
        state.backlinkDocumentViewState,
        documentId,
        normalizedLevel,
        { preserveFoldState: true },
      );
      refreshBacklinkDocumentGroupById(documentId);
    }
  }

  function stepAllBacklinkDocumentContextVisibilityLevel(direction = "next") {
    const currentLevel = getBacklinkDocumentRenderStateDep(
      state.backlinkDocumentViewState,
      "",
    ).contextVisibilityLevel;
    const nextLevel = cycleBacklinkContextLevelDep(currentLevel, direction);
    setAllBacklinkDocumentContextVisibilityLevel(nextLevel);
    return nextLevel;
  }

  function expandAllBacklinkDocument() {
    const documentLiElementArray = state.backlinkULElement?.querySelectorAll(
      "li.list-item__document-name",
    );
    for (const documentLiElement of documentLiElementArray || []) {
      expandBacklinkDocument(documentLiElement);
    }
  }

  function expandAllBacklinkListItemNode() {
    const backlinkProtyleElementArray =
      state.backlinkULElement?.querySelectorAll("div.protyle");
    for (const backlinkProtyle of backlinkProtyleElementArray || []) {
      expandAllListItemNode(backlinkProtyle);
    }
  }

  function collapseAllBacklinkDocument() {
    const documentLiElementArray = state.backlinkULElement?.querySelectorAll(
      "li.list-item__document-name",
    );
    for (const documentLiElement of documentLiElementArray || []) {
      collapseBacklinkDocument(documentLiElement);
    }
  }

  function collapseAllBacklinkListItemNode() {
    const backlinkProtyleElementArray =
      state.backlinkULElement?.querySelectorAll("div.protyle");
    for (const backlinkProtyle of backlinkProtyleElementArray || []) {
      collapseAllListItemNode(backlinkProtyle, { syHasChildListNode });
    }
  }

  return {
    setAllBacklinkDocumentContextVisibilityLevel,
    stepAllBacklinkDocumentContextVisibilityLevel,
    expandAllBacklinkDocument,
    expandAllBacklinkListItemNode,
    collapseAllBacklinkDocument,
    collapseAllBacklinkListItemNode,
  };
}
