export function createBacklinkPanelRenderBindings({
  state,
  renderBacklinkDocumentGroupByHelper,
  updateBacklinkDocumentLiNavigation,
  getBacklinkContextControlState,
  syncBacklinkDocumentProtyleState,
  captureBacklinkProtyleState,
  markBacklinkDocumentFoldState,
  removeEditor,
  ProtyleCtor,
  app,
  buildBacklinkDocumentRenderOptions,
  getBacklinkDocumentRenderState,
  applyCreatedBacklinkProtyleState,
  emitLoadedProtyleStatic,
  expandBacklinkDocument,
  collapseBacklinkDocument,
  expandAllListItemNode,
  expandBacklinkHeadingMore,
  foldListItemNodeByIdSet,
  defaultExpandedListItemLevel,
  expandListItemNodeByDepth,
  getElementsBeforeDepth,
  getElementsAtDepth,
  syHasChildListNode,
  hideBlocksOutsideBacklinkSourceWindow,
  hideOtherListItemElement,
  isSetEmpty,
  isSetNotEmpty,
  isArrayNotEmpty,
  sanitizeBacklinkKeywords,
  splitKeywordStringToArray,
  highlightElementTextByCss,
  delayedTwiceRefresh,
  addEditor,
  attachBacklinkDocumentGroupRefreshTracking,
  detachDocumentGroupRefreshTracking,
  groupBacklinksByDocument,
  batchRenderBacklinkDocumentGroups,
  isArrayEmpty,
  documentRef,
  emptyContentText,
  createBacklinkDocumentListItemElement,
  mouseDownBacklinkDocumentLiElement,
  clickBacklinkDocumentLiElement,
  contextmenuBacklinkDocumentLiElement,
  toggleBacklinkDocument,
  navigateBacklinkDocument,
  stepBacklinkDocumentContext,
  navigateBacklinkBreadcrumb,
  handleTargetBlockClick,
  showReferencedTargetBlock = () => true,
} = {}) {
  function renderBacklinkDocumentGroup(
    documentGroup,
    documentLiElement,
    editorElement,
  ) {
    const documentId = documentGroup?.documentId;
    if (documentId) {
      detachDocumentGroupRefreshTracking(documentId);
    }

    const isShowTargetBlock =
      typeof showReferencedTargetBlock === "function"
        ? showReferencedTargetBlock()
        : Boolean(showReferencedTargetBlock);

    const editor = renderBacklinkDocumentGroupByHelper({
      documentGroup,
      documentLiElement,
      editorElement,
      backlinkDocumentEditorMap: state.backlinkDocumentEditorMap,
      backlinkDocumentViewState: state.backlinkDocumentViewState,
      deps: {
        updateBacklinkDocumentLiNavigation: (documentLiElementArg, documentGroupArg) =>
          updateBacklinkDocumentLiNavigation(
            documentLiElementArg,
            documentGroupArg,
            getBacklinkContextControlState(documentGroupArg),
            {
              showReferencedTargetBlock: isShowTargetBlock,
              onTargetBlockClick: handleTargetBlockClick,
            },
          ),
        syncBacklinkDocumentProtyleState: (editorArg) =>
          syncBacklinkDocumentProtyleState(editorArg, {
            backlinkDocumentFoldMap: state.backlinkDocumentFoldMap,
            backlinkProtyleItemFoldMap: state.backlinkProtyleItemFoldMap,
            backlinkProtyleHeadingExpandMap:
              state.backlinkProtyleHeadingExpandMap,
            captureBacklinkProtyleState,
            markBacklinkDocumentFoldState,
          }),
        removeEditor,
        ProtyleCtor,
        app,
        buildBacklinkDocumentRenderOptions,
        getBacklinkDocumentRenderState,
        applyCreatedBacklinkProtyleState: ({
          backlinkData,
          documentLiElement: documentLiElementArg,
          protyle,
          contextVisibilityLevel,
          showFullDocument,
        }) =>
          applyCreatedBacklinkProtyleState({
            backlinkData,
            documentLiElement: documentLiElementArg,
            protyle,
            contextVisibilityLevel,
            showFullDocument,
            deps: {
              emitLoadedProtyleStatic,
              getBacklinkDocumentRenderState,
              backlinkDocumentViewState: state.backlinkDocumentViewState,
              expandBacklinkDocument,
              collapseBacklinkDocument,
              expandAllListItemNode,
              expandBacklinkHeadingMore,
              backlinkProtyleItemFoldMap: state.backlinkProtyleItemFoldMap,
              foldListItemNodeByIdSet,
              defaultExpandedListItemLevel,
              expandListItemNodeByDepth,
              getElementsBeforeDepth,
              getElementsAtDepth,
              syHasChildListNode,
              backlinkProtyleHeadingExpandMap:
                state.backlinkProtyleHeadingExpandMap,
              hideBlocksOutsideBacklinkSourceWindow,
              hideOtherListItemElement,
              queryParams: state.queryParams,
              isSetEmpty,
              isSetNotEmpty,
              isArrayNotEmpty,
              sanitizeBacklinkKeywords,
              splitKeywordStringToArray,
              highlightElementTextByCss,
              delayedTwiceRefresh,
            },
          }),
        addEditor,
      },
    });
    if (documentId) {
      attachBacklinkDocumentGroupRefreshTracking(editor, documentId);
    }
    return editor;
  }

  function batchCreateOfficialBacklinkProtyle(
    backlinkDocumentArray,
    backlinkDataArray,
  ) {
    const isShowTargetBlock =
      typeof showReferencedTargetBlock === "function"
        ? showReferencedTargetBlock()
        : Boolean(showReferencedTargetBlock);

    state.backlinkDocumentGroupArray = batchRenderBacklinkDocumentGroups({
      backlinkDocumentArray,
      backlinkDataArray,
      backlinkDocumentActiveIndexMap: state.backlinkDocumentActiveIndexMap,
      backlinkULElement: state.backlinkULElement,
      deps: {
        groupBacklinksByDocument,
        isArrayEmpty,
        documentRef,
        emptyContentText,
        createDocumentListItemElement: (documentGroup) =>
          createBacklinkDocumentListItemElement({
            documentGroup,
            contextControlState: getBacklinkContextControlState(documentGroup),
            showReferencedTargetBlock: isShowTargetBlock,
            parentElement: state.backlinkULElement,
            documentRef,
            onMouseDown: mouseDownBacklinkDocumentLiElement,
            onDocumentClick: clickBacklinkDocumentLiElement,
            onContextMenu: contextmenuBacklinkDocumentLiElement,
            onToggle: toggleBacklinkDocument,
            onNavigate: navigateBacklinkDocument,
            onStepContextLevel: stepBacklinkDocumentContext,
            onBreadcrumbNavigate: navigateBacklinkBreadcrumb,
            onTargetBlockClick: handleTargetBlockClick,
          }),
        renderDocumentGroup: renderBacklinkDocumentGroup,
      },
    });
  }

  function getBacklinkContextControlStateWrapper(documentGroup) {
    return getBacklinkContextControlState(documentGroup);
  }

  return {
    renderBacklinkDocumentGroup,
    batchCreateOfficialBacklinkProtyle,
    getBacklinkContextControlState: getBacklinkContextControlStateWrapper,
  };
}
