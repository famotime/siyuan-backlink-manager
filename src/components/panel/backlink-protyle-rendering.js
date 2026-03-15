export function syncBacklinkDocumentProtyleState(editor, deps) {
  const {
    backlinkDocumentFoldMap,
    backlinkProtyleItemFoldMap,
    backlinkProtyleHeadingExpandMap,
    captureBacklinkProtyleState,
    markBacklinkDocumentFoldState,
  } = deps;

  const protyleState = captureBacklinkProtyleState(editor);
  if (!protyleState) {
    return;
  }

  markBacklinkDocumentFoldState(
    backlinkDocumentFoldMap,
    protyleState.backlinkRootId,
    protyleState.isFolded,
  );

  let foldSet = backlinkProtyleItemFoldMap.get(protyleState.backlinkBlockId);
  if (!foldSet) {
    foldSet = new Set();
  }
  foldSet.clear();
  for (const nodeId of protyleState.foldedItemIds) {
    foldSet.add(nodeId);
  }
  backlinkProtyleItemFoldMap.set(protyleState.backlinkBlockId, foldSet);
  backlinkProtyleHeadingExpandMap.set(
    protyleState.backlinkBlockId,
    protyleState.expandHeadingMore,
  );
}

export function batchRenderBacklinkDocumentGroups({
  backlinkDocumentArray = [],
  backlinkDataArray = [],
  backlinkDocumentActiveIndexMap,
  backlinkULElement,
  deps,
}) {
  const {
    groupBacklinksByDocument,
    isArrayEmpty,
    documentRef = globalThis.document,
    emptyContentText = "",
    createDocumentListItemElement,
    renderDocumentGroup,
  } = deps;

  const backlinkDocumentGroupArray = groupBacklinksByDocument(
    backlinkDocumentArray,
    backlinkDataArray,
    backlinkDocumentActiveIndexMap,
  );
  if (isArrayEmpty(backlinkDocumentGroupArray)) {
    const pElement = documentRef.createElement("p");
    pElement.style.padding = "5px 15px";
    pElement.innerText = emptyContentText;
    backlinkULElement.append(pElement);
    return backlinkDocumentGroupArray;
  }

  for (const documentGroup of backlinkDocumentGroupArray) {
    const documentLiElement = createDocumentListItemElement(documentGroup);
    const editorElement = documentRef.createElement("div");
    editorElement.style.minHeight = "auto";
    editorElement.setAttribute("data-backlink-root-id", documentGroup.documentId);

    backlinkULElement.append(editorElement);
    renderDocumentGroup(documentGroup, documentLiElement, editorElement);
  }
  return backlinkDocumentGroupArray;
}

export function renderBacklinkDocumentGroup({
  documentGroup,
  documentLiElement,
  editorElement,
  backlinkDocumentEditorMap,
  backlinkDocumentViewState,
  deps,
}) {
  if (
    !documentGroup ||
    !documentLiElement ||
    !editorElement ||
    !documentGroup.activeBacklink
  ) {
    return null;
  }

  const {
    updateBacklinkDocumentLiNavigation,
    syncBacklinkDocumentProtyleState,
    removeEditor,
    ProtyleCtor,
    app,
    buildBacklinkDocumentRenderOptions,
    getBacklinkDocumentRenderState,
    applyCreatedBacklinkProtyleState,
    addEditor,
  } = deps;

  updateBacklinkDocumentLiNavigation(documentLiElement, documentGroup);

  const existingEditor = backlinkDocumentEditorMap.get(documentGroup.documentId);
  if (existingEditor) {
    syncBacklinkDocumentProtyleState(existingEditor);
    existingEditor.destroy();
    removeEditor(existingEditor);
  }

  editorElement.innerHTML = "";
  const activeBacklink = documentGroup.activeBacklink;
  const renderState = getBacklinkDocumentRenderState(
    backlinkDocumentViewState,
    documentGroup.documentId,
  );
  const showFullDocument = renderState.showFullDocument;
  const contextVisibilityLevel = renderState.contextVisibilityLevel;
  const editor = new ProtyleCtor(
    app,
    editorElement,
    buildBacklinkDocumentRenderOptions({
      documentId: documentGroup.documentId,
      activeBacklink,
      contextVisibilityLevel,
      showFullDocument,
    }),
  );

  applyCreatedBacklinkProtyleState({
    backlinkData: activeBacklink,
    documentLiElement,
    protyle: editor,
    contextVisibilityLevel,
    showFullDocument,
  });

  editor.protyle.notebookId = activeBacklink.backlinkBlock.box;
  backlinkDocumentEditorMap.set(documentGroup.documentId, editor);
  addEditor(editor);
  return editor;
}

export function applyCreatedBacklinkProtyleState({
  backlinkData,
  documentLiElement,
  protyle,
  contextVisibilityLevel = "core",
  showFullDocument = false,
  deps,
}) {
  const {
    emitLoadedProtyleStatic,
    getBacklinkDocumentRenderState,
    backlinkDocumentViewState,
    expandBacklinkDocument,
    collapseBacklinkDocument,
    expandAllListItemNode,
    expandBacklinkHeadingMore,
    backlinkProtyleItemFoldMap,
    foldListItemNodeByIdSet,
    hideBlocksOutsideBacklinkSourceWindow,
    defaultExpandedListItemLevel,
    expandListItemNodeByDepth,
    getElementsBeforeDepth,
    getElementsAtDepth,
    syHasChildListNode,
    backlinkProtyleHeadingExpandMap,
    hideOtherListItemElement,
    queryParams,
    isSetEmpty,
    isSetNotEmpty,
    isArrayNotEmpty,
    sanitizeBacklinkKeywords,
    splitKeywordStringToArray,
    highlightElementTextByCss,
    delayedTwiceRefresh,
  } = deps;

  emitLoadedProtyleStatic?.(protyle);

  const protyleContentElement = protyle?.protyle?.contentElement;
  if (!protyleContentElement || !backlinkData?.backlinkBlock) {
    return;
  }

  const backlinkBlockId = backlinkData.backlinkBlock.id;
  const backlinkRootId = backlinkData.backlinkBlock.root_id;

  if (showFullDocument) {
    expandBacklinkDocument(documentLiElement);
  } else if (
    getBacklinkDocumentRenderState(backlinkDocumentViewState, backlinkRootId)
      .isFolded
  ) {
    collapseBacklinkDocument(documentLiElement);
  }

  if (showFullDocument) {
    expandAllListItemNode(protyleContentElement);
    expandBacklinkHeadingMore(protyleContentElement);
  } else {
    const foldIdSet = backlinkProtyleItemFoldMap.get(backlinkBlockId);
    if (foldIdSet) {
      foldListItemNodeByIdSet(protyleContentElement, foldIdSet);
    } else if (contextVisibilityLevel === "extended") {
      expandAllListItemNode(protyleContentElement);
    } else if (
      contextVisibilityLevel === "nearby" &&
      defaultExpandedListItemLevel >= 0
    ) {
      expandListItemNodeByDepth(
        protyleContentElement,
        Math.max(defaultExpandedListItemLevel + 1, 1),
        {
          getElementsBeforeDepth,
          getElementsAtDepth,
          syHasChildListNode,
        },
      );
    } else if (defaultExpandedListItemLevel > 0) {
      expandListItemNodeByDepth(
        protyleContentElement,
        defaultExpandedListItemLevel,
        {
          getElementsBeforeDepth,
          getElementsAtDepth,
          syHasChildListNode,
        },
      );
    }

    if (
      contextVisibilityLevel === "nearby" ||
      contextVisibilityLevel === "extended" ||
      backlinkProtyleHeadingExpandMap.get(backlinkBlockId)
    ) {
      expandBacklinkHeadingMore(protyleContentElement);
    }
  }

  if (!showFullDocument) {
    hideBlocksOutsideBacklinkSourceWindow?.(
      backlinkData,
      protyleContentElement,
      contextVisibilityLevel,
    );
    hideOtherListItemElement(backlinkData, protyleContentElement, queryParams, {
      isSetEmpty,
      isSetNotEmpty,
      isArrayNotEmpty,
    });
  }

  const keywordArray = sanitizeBacklinkKeywords(
    splitKeywordStringToArray(queryParams.backlinkKeywordStr),
  );
  highlightElementTextByCss(documentLiElement, keywordArray);
  delayedTwiceRefresh(() => {
    if (!showFullDocument) {
      hideBlocksOutsideBacklinkSourceWindow?.(
        backlinkData,
        protyleContentElement,
        contextVisibilityLevel,
      );
      hideOtherListItemElement(backlinkData, protyleContentElement, queryParams, {
        isSetEmpty,
        isSetNotEmpty,
        isArrayNotEmpty,
      });
    }
    highlightElementTextByCss(protyleContentElement, keywordArray);
  }, 100);
  protyleContentElement.addEventListener("touchend", (event) => {
    event.stopPropagation();
  });
}
