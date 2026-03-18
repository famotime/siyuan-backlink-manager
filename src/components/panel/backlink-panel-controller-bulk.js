export function createBacklinkPanelBulkActions({
  state,
  expandBacklinkDocument,
  collapseBacklinkDocument,
  expandAllListItemNode,
  collapseAllListItemNode,
  syHasChildListNode,
} = {}) {
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
    expandAllBacklinkDocument,
    expandAllBacklinkListItemNode,
    collapseAllBacklinkDocument,
    collapseAllBacklinkListItemNode,
  };
}
