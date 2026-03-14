import { EnvConfig } from "@/config/EnvConfig";
import { CacheManager } from "@/config/CacheManager";
import { BacklinkFilterPanelAttributeService } from "@/service/setting/BacklinkPanelFilterCriteriaService";
import { SettingService } from "@/service/setting/SettingService";
import {
  getBacklinkPanelData,
  getBacklinkPanelRenderData,
  getTurnPageBacklinkPanelRenderData,
} from "@/service/backlink/backlink-data";
import {
  defBlockArrayTypeAndKeywordFilter,
  defBlockArraySort,
} from "@/service/backlink/backlink-def-blocks.js";
import {
  isArrayEmpty,
  isArrayNotEmpty,
  isSetEmpty,
  isSetNotEmpty,
} from "@/utils/array-util";
import {
  clearProtyleGutters,
  getElementsAtDepth,
  getElementsBeforeDepth,
  highlightElementTextByCss,
  syHasChildListNode,
} from "@/utils/html-util";
import { isStrBlank, splitKeywordStringToArray } from "@/utils/string-util";
import { delayedTwiceRefresh } from "@/utils/timing-util";
import { getBatchBlockIdIndex, getBlockIsFolded } from "@/utils/api";
import { getOpenTabActionByZoomIn } from "@/utils/siyuan-util";
import { Constants, openMobileFileById, openTab, Protyle } from "siyuan";
import {
  getCyclicBacklinkIndex,
  groupBacklinksByDocument,
} from "./backlink-document-navigation.js";
import {
  buildBacklinkDocumentRenderOptions,
  getBacklinkDocumentClickAction,
  getBacklinkDocumentTargetRole,
  getNextBacklinkContextVisibilityLevel,
  shouldHandleBacklinkDocumentClick,
} from "./backlink-document-interaction.js";
import {
  createBacklinkDocumentListItemElement,
  getBacklinkContextLevelLabel,
  updateBacklinkDocumentLiNavigation,
} from "./backlink-document-row.js";
import {
  captureBacklinkProtyleState,
  collapseAllListItemNode,
  expandAllListItemNode,
  expandBacklinkHeadingMore,
  expandListItemNodeByDepth,
  foldListItemNodeByIdSet,
  hideOtherListItemElement,
} from "./backlink-protyle-dom.js";
import {
  applyCreatedBacklinkProtyleState,
  batchRenderBacklinkDocumentGroups,
  renderBacklinkDocumentGroup as renderBacklinkDocumentGroupByHelper,
  syncBacklinkDocumentProtyleState,
} from "./backlink-protyle-rendering.js";
import {
  applySavedPanelCriteria,
  clonePanelQueryParamsForSave,
  resetBacklinkQueryParameters,
  resetFilterQueryParameters,
  toggleRelatedDefBlockCondition,
  toggleRelatedDocumentCondition,
} from "./backlink-panel-query-params.js";
import {
  advanceBacklinkDocumentVisibilityLevel,
  getBacklinkDocumentRenderState,
  markBacklinkDocumentExpanded,
  markBacklinkDocumentFoldState,
  markBacklinkDocumentFullView,
} from "./backlink-document-view-state.js";
import { sanitizeBacklinkKeywords } from "./backlink-panel-formatting.js";

export function createBacklinkPanelController(state) {
  function getEditors() {
    if (state.currentTab) {
      if (!Array.isArray(state.currentTab.editors)) {
        state.currentTab.editors = [];
      }
      return state.currentTab.editors;
    }
    return state.defalutEditors;
  }

  function addEditor(editor) {
    const editors = getEditors();
    editors.push(editor);
  }

  function removeEditor(editor) {
    const editors = getEditors();
    const editorIndex = editors.indexOf(editor);
    if (editorIndex >= 0) {
      editors.splice(editorIndex, 1);
    }
  }

  function clearEditors() {
    if (state.currentTab) {
      state.currentTab.editors = [];
    }
    state.defalutEditors = [];
  }

  function emitLoadedProtyleStatic(protyle) {
    EnvConfig.ins.plugin.app.plugins.forEach((item) => {
      if (item.name !== "syplugin-image-pin-preview") {
        return;
      }
      item.eventBus.emit("loaded-protyle-static", {
        protyle: protyle.protyle,
      });
    });
  }

  function updateLastCriteria() {
    if (!state.rootId || !state.queryParams) {
      return;
    }
    BacklinkFilterPanelAttributeService.ins.updatePanelCriteria(state.rootId, {
      queryParams: state.queryParams,
      backlinkPanelFilterViewExpand: state.panelFilterViewExpand,
    });
  }

  function initEvent() {
    if (!state.backlinkULElement) {
      return;
    }
    state.backlinkULElement.addEventListener("mouseleave", () => {
      clearProtyleGutters(state.backlinkULElement);
    });
    state.backlinkULElement.addEventListener("mousemove", (event) => {
      const target = event.target;
      if (
        (target && target.classList?.contains("b3-list-item__text")) ||
        target?.classList?.contains("list-item__document-name")
      ) {
        clearProtyleGutters(state.backlinkULElement);
      }
    });
  }

  function clickBacklinkDocumentLiElement(event) {
    const target = event.currentTarget;
    const targetRole = getBacklinkDocumentTargetRole(event.target);
    if (!shouldHandleBacklinkDocumentClick({ targetRole })) {
      return;
    }
    const action = getBacklinkDocumentClickAction({
      ctrlKey: event.ctrlKey,
      targetRole,
    });

    if (action === "open-block") {
      openBlockTab(
        target.getAttribute("data-node-id"),
        target.getAttribute("data-backlink-block-id"),
      );
      return;
    }

    if (action === "toggle-fold") {
      toggleBacklinkDocument(target);
      return;
    }

    if (action === "expand-context") {
      expandBacklinkDocumentContext(target);
    }
  }

  function contextmenuBacklinkDocumentLiElement(event) {
    const target = event.currentTarget;
    openBlockTab(
      target.getAttribute("data-node-id"),
      target.getAttribute("data-backlink-block-id"),
    );
  }

  function expandBacklinkDocument(documentLiElement) {
    const documentId = documentLiElement.getAttribute("data-node-id");
    markBacklinkDocumentExpanded(state.backlinkDocumentFoldMap, documentId);
    documentLiElement.nextElementSibling?.classList.remove("fn__none");
    documentLiElement.classList.remove("backlink-hide");
    documentLiElement
      .querySelector(".b3-list-item__arrow")
      ?.classList.add("b3-list-item__arrow--open");
  }

  function collapseBacklinkDocument(documentLiElement) {
    const documentId = documentLiElement.getAttribute("data-node-id");
    markBacklinkDocumentFoldState(state.backlinkDocumentFoldMap, documentId, true);
    documentLiElement.nextElementSibling?.classList.add("fn__none");
    documentLiElement.classList.add("backlink-hide");
    documentLiElement
      .querySelector(".b3-list-item__arrow")
      ?.classList.remove("b3-list-item__arrow--open");
  }

  function toggleBacklinkDocument(documentLiElement) {
    const closeStatus = documentLiElement.classList.contains("backlink-hide");
    if (closeStatus) {
      expandBacklinkDocument(documentLiElement);
    } else {
      collapseBacklinkDocument(documentLiElement);
    }
  }

  function renderBacklinkDocumentGroup(
    documentGroup,
    documentLiElement,
    editorElement,
  ) {
    renderBacklinkDocumentGroupByHelper({
      documentGroup,
      documentLiElement,
      editorElement,
      backlinkDocumentEditorMap: state.backlinkDocumentEditorMap,
      backlinkDocumentViewState: state.backlinkDocumentViewState,
      deps: {
        updateBacklinkDocumentLiNavigation: (documentLiElement, documentGroup) =>
          updateBacklinkDocumentLiNavigation(
            documentLiElement,
            documentGroup,
            getBacklinkContextControlState(documentGroup),
          ),
        syncBacklinkDocumentProtyleState: (editor) =>
          syncBacklinkDocumentProtyleState(editor, {
            backlinkDocumentFoldMap: state.backlinkDocumentFoldMap,
            backlinkProtyleItemFoldMap: state.backlinkProtyleItemFoldMap,
            backlinkProtyleHeadingExpandMap:
              state.backlinkProtyleHeadingExpandMap,
            captureBacklinkProtyleState,
            markBacklinkDocumentFoldState,
          }),
        removeEditor,
        ProtyleCtor: Protyle,
        app: EnvConfig.ins.app,
        buildBacklinkDocumentRenderOptions,
        getBacklinkDocumentRenderState,
        applyCreatedBacklinkProtyleState: ({
          backlinkData,
          documentLiElement,
          protyle,
          showFullDocument,
        }) =>
          applyCreatedBacklinkProtyleState({
            backlinkData,
            documentLiElement,
            protyle,
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
              defaultExpandedListItemLevel:
                SettingService.ins.SettingConfig.defaultExpandedListItemLevel,
              expandListItemNodeByDepth,
              getElementsBeforeDepth,
              getElementsAtDepth,
              syHasChildListNode,
              backlinkProtyleHeadingExpandMap:
                state.backlinkProtyleHeadingExpandMap,
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
  }

  function batchCreateOfficialBacklinkProtyle(
    backlinkDocumentArray,
    backlinkDataArray,
  ) {
    state.backlinkDocumentGroupArray = batchRenderBacklinkDocumentGroups({
      backlinkDocumentArray,
      backlinkDataArray,
      backlinkDocumentActiveIndexMap: state.backlinkDocumentActiveIndexMap,
      backlinkULElement: state.backlinkULElement,
      deps: {
        groupBacklinksByDocument,
        isArrayEmpty,
        documentRef: document,
        emptyContentText: window.siyuan.languages.emptyContent,
        createDocumentListItemElement: (documentGroup) =>
          createBacklinkDocumentListItemElement({
            documentGroup,
            contextControlState: getBacklinkContextControlState(documentGroup),
            parentElement: state.backlinkULElement,
            documentRef: document,
            onDocumentClick: clickBacklinkDocumentLiElement,
            onContextMenu: contextmenuBacklinkDocumentLiElement,
            onToggle: toggleBacklinkDocument,
            onNavigate: navigateBacklinkDocument,
            onAdvanceContextLevel: expandBacklinkDocumentContext,
          }),
        renderDocumentGroup: renderBacklinkDocumentGroup,
      },
    });
  }

  function getBacklinkContextControlState(documentGroup) {
    const renderState = getBacklinkDocumentRenderState(
      state.backlinkDocumentViewState,
      documentGroup?.documentId,
    );
    const contextVisibilityLevel = renderState.contextVisibilityLevel;
    const nextVisibilityLevel =
      getNextBacklinkContextVisibilityLevel(contextVisibilityLevel);
    const hasMoreContext = contextVisibilityLevel !== "full";

    return {
      contextVisibilityLevel,
      levelLabel: getBacklinkContextLevelLabel(contextVisibilityLevel),
      nextActionLabel: hasMoreContext
        ? `展开到${getBacklinkContextLevelLabel(nextVisibilityLevel)}`
        : "",
      hasMoreContext,
    };
  }

  function clearBacklinkProtyleList() {
    const editors = getEditors();
    if (isArrayNotEmpty(editors)) {
      editors.forEach((editor) => {
        syncBacklinkDocumentProtyleState(editor, {
          backlinkDocumentFoldMap: state.backlinkDocumentFoldMap,
          backlinkProtyleItemFoldMap: state.backlinkProtyleItemFoldMap,
          backlinkProtyleHeadingExpandMap: state.backlinkProtyleHeadingExpandMap,
          captureBacklinkProtyleState,
          markBacklinkDocumentFoldState,
        });
        editor.destroy();
      });
    }
    clearEditors();
    state.backlinkDocumentEditorMap.clear();
    if (state.backlinkULElement) {
      state.backlinkULElement.innerHTML = "";
    }
  }

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

  function expandBacklinkDocumentContext(documentLiElement) {
    if (!documentLiElement) {
      return;
    }

    const documentId = documentLiElement.getAttribute("data-node-id");
    const editorElement = documentLiElement.nextElementSibling;
    if (!documentId || !editorElement) {
      return;
    }

    const nextVisibilityLevel = advanceBacklinkDocumentVisibilityLevel(
      state.backlinkDocumentViewState,
      documentId,
    );
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
    renderBacklinkDocumentGroup(documentGroup, documentLiElement, editorElement);
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

  async function openDesktopBlockTab(params) {
    if (params.rootId === params.blockId) {
      params.actions = [Constants.CB_GET_FOCUS, Constants.CB_GET_SCROLL];
    }
    openTab({
      app: EnvConfig.ins.app,
      doc: {
        id: params.blockId,
        action: params.actions,
      },
    });
  }

  async function openBlockTab(rootId, blockId) {
    const zoomIn = await getBlockIsFolded(blockId);
    const actions = getOpenTabActionByZoomIn(zoomIn);

    if (EnvConfig.ins.isMobile) {
      openMobileFileById(EnvConfig.ins.app, blockId, actions);
      return;
    }

    openDesktopBlockTab({ zoomIn, actions, rootId, blockId });
  }

  async function initBaseData() {
    if (!state.rootId) {
      return;
    }
    clearBacklinkProtyleList();
    state.backlinkDocumentActiveIndexMap.clear();

    state.previousRootId = state.rootId;
    state.previousFocusBlockId = state.focusBlockId;
    const settingConfig = SettingService.ins.SettingConfig;
    state.hideBacklinkProtyleBreadcrumb =
      settingConfig.hideBacklinkProtyleBreadcrumb;

    state.backlinkFilterPanelBaseData = await getBacklinkPanelData({
      rootId: state.rootId,
      focusBlockId: state.focusBlockId,
      queryParentDefBlock: settingConfig.queryParentDefBlock,
      querrChildDefBlockForListItem:
        settingConfig.querrChildDefBlockForListItem,
      queryChildDefBlockForHeadline:
        settingConfig.queryChildDefBlockForHeadline,
      queryCurDocDefBlockRange: state.queryCurDocDefBlockRange,
    });
    state.displayHintPanelBaseDataCacheUsage = Boolean(
      state.backlinkFilterPanelBaseData?.userCache,
    );

    const defaultPanelCriteria =
      await BacklinkFilterPanelAttributeService.ins.getPanelCriteria(state.rootId);

    state.queryParams = defaultPanelCriteria.queryParams;
    state.panelFilterViewExpand =
      defaultPanelCriteria.backlinkPanelFilterViewExpand;
    state.queryParams.pageNum = 1;

    state.savedQueryParamMap =
      await BacklinkFilterPanelAttributeService.ins.getPanelSavedCriteriaMap(
        state.rootId,
      );

    if (settingConfig.defaultSelectedViewBlock) {
      const selectBlockId = state.previousRootId;
      let viewBlockExistBacklink = false;
      state.backlinkFilterPanelBaseData.curDocDefBlockArray.forEach((item) => {
        if (item.id === selectBlockId) {
          viewBlockExistBacklink = true;
        }
      });

      if (viewBlockExistBacklink) {
        state.queryParams.includeRelatedDefBlockIds = new Set();
        state.queryParams.excludeRelatedDefBlockIds = new Set();
        state.queryParams.includeDocumentIds = new Set();
        state.queryParams.excludeDocumentIds = new Set();
        state.queryParams.includeRelatedDefBlockIds.add(selectBlockId);
      }
    }

    await updateRenderData();
  }

  async function refreshFilterDisplayData() {
    if (!state.backlinkFilterPanelRenderData || !state.queryParams) {
      return;
    }

    const curDocDefBlockArray =
      state.backlinkFilterPanelRenderData.curDocDefBlockArray;
    const relatedDefBlockArray =
      state.backlinkFilterPanelRenderData.relatedDefBlockArray;
    const backlinkDocumentArray =
      state.backlinkFilterPanelRenderData.backlinkDocumentArray;

    defBlockArrayTypeAndKeywordFilter(
      curDocDefBlockArray,
      null,
      state.queryParams.filterPanelCurDocDefBlockKeywords,
    );
    defBlockArrayTypeAndKeywordFilter(
      relatedDefBlockArray,
      state.queryParams.filterPanelRelatedDefBlockType,
      state.queryParams.filterPanelRelatedDefBlockKeywords,
    );
    defBlockArrayTypeAndKeywordFilter(
      backlinkDocumentArray,
      null,
      state.queryParams.filterPanelBacklinkDocumentKeywords,
    );

    await defBlockArraySort(
      curDocDefBlockArray,
      state.queryParams.filterPanelCurDocDefBlockSortMethod,
      { getBatchBlockIdIndex },
    );
    await defBlockArraySort(
      relatedDefBlockArray,
      state.queryParams.filterPanelRelatedDefBlockSortMethod,
      { getBatchBlockIdIndex },
    );
    await defBlockArraySort(
      backlinkDocumentArray,
      state.queryParams.filterPanelBacklinkDocumentSortMethod,
      { getBatchBlockIdIndex },
    );

    state.backlinkFilterPanelRenderData = state.backlinkFilterPanelRenderData;
  }

  async function updateRenderData() {
    state.backlinkFilterPanelRenderData = await getBacklinkPanelRenderData(
      state.backlinkFilterPanelBaseData,
      state.queryParams,
    );
    if (state.backlinkFilterPanelRenderData.rootId !== state.rootId) {
      return;
    }

    state.queryParams = state.queryParams;
    await refreshFilterDisplayData();
    refreshBacklinkPreview();
  }

  async function pageTurning(pageNumParam) {
    if (
      pageNumParam < 1 ||
      pageNumParam > state.backlinkFilterPanelRenderData.totalPage
    ) {
      return;
    }

    state.queryParams.pageNum = pageNumParam;
    const pageBacklinkPanelRenderData =
      await getTurnPageBacklinkPanelRenderData(
        state.backlinkFilterPanelRenderData.rootId,
        state.backlinkFilterPanelRenderData.backlinkBlockNodeArray,
        state.queryParams,
      );

    state.backlinkFilterPanelRenderData.backlinkDataArray =
      pageBacklinkPanelRenderData.backlinkDataArray;
    state.backlinkFilterPanelRenderData.pageNum =
      pageBacklinkPanelRenderData.pageNum;
    state.backlinkFilterPanelRenderData.usedCache =
      pageBacklinkPanelRenderData.usedCache;
    state.queryParams = state.queryParams;
    refreshBacklinkPreview();
  }

  function navigateBacklinkDocument(event, direction) {
    event.preventDefault();

    const target = event.currentTarget;
    const documentLiElement = target.closest(".list-item__document-name");
    if (!documentLiElement) {
      return;
    }

    const documentId = documentLiElement.getAttribute("data-node-id");
    const editorElement = documentLiElement.nextElementSibling;
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
    state.backlinkDocumentGroupArray = groupBacklinksByDocument(
      state.backlinkFilterPanelRenderData.backlinkDocumentArray,
      state.backlinkFilterPanelRenderData.backlinkDataArray,
      state.backlinkDocumentActiveIndexMap,
    );

    const nextDocumentGroup = state.backlinkDocumentGroupArray.find(
      (group) => group.documentId === documentId,
    );
    renderBacklinkDocumentGroup(
      nextDocumentGroup,
      documentLiElement,
      editorElement,
    );
  }

  function clearCacheAndRefresh() {
    CacheManager.ins.deleteBacklinkPanelAllCache(state.rootId);
    initBaseData();
  }

  function resetFilterQueryParametersToDefault() {
    const defaultQueryParams =
      BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
    resetFilterQueryParameters(state.queryParams, defaultQueryParams);
    state.queryParams = state.queryParams;
    updateRenderData();
  }

  function resetBacklinkQueryParametersToDefault() {
    const defaultQueryParams =
      BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
    resetBacklinkQueryParameters(state.queryParams, defaultQueryParams);
    updateRenderData();
  }

  function addIncludeRelatedDefBlockCondition(defBlock) {
    toggleRelatedDefBlockCondition(state.queryParams, defBlock.id, "include");
    updateRenderData();
  }

  function addExcludeRelatedDefBlockCondition(defBlock) {
    toggleRelatedDefBlockCondition(state.queryParams, defBlock.id, "exclude");
    updateRenderData();
  }

  function addIncludeRelatedDocBlockCondition(defBlock) {
    toggleRelatedDocumentCondition(state.queryParams, defBlock.id, "include");
    updateRenderData();
  }

  function addExcludeRelatedDocBlockCondition(defBlock) {
    toggleRelatedDocumentCondition(state.queryParams, defBlock.id, "exclude");
    updateRenderData();
  }

  function handleRelatedDefBlockClick(event, defBlock) {
    if (event.shiftKey) {
      addExcludeRelatedDefBlockCondition(defBlock);
      return;
    }
    state.clickCount += 1;
    if (state.clickCount === 1) {
      clearTimeout(state.clickTimeoutId);
      state.clickTimeoutId = setTimeout(() => {
        state.clickCount = 0;
        addIncludeRelatedDefBlockCondition(defBlock);
      }, state.doubleClickTimeout);
      return;
    }

    clearTimeout(state.clickTimeoutId);
    state.clickCount = 0;
    addExcludeRelatedDefBlockCondition(defBlock);
  }

  function handleRelatedDefBlockContextmenu(_event, defBlock) {
    addExcludeRelatedDefBlockCondition(defBlock);
  }

  function handleRelatedDocBlockClick(event, defBlock) {
    if (event.shiftKey) {
      addExcludeRelatedDocBlockCondition(defBlock);
      return;
    }
    state.clickCount += 1;
    if (state.clickCount === 1) {
      clearTimeout(state.clickTimeoutId);
      state.clickTimeoutId = setTimeout(() => {
        state.clickCount = 0;
        addIncludeRelatedDocBlockCondition(defBlock);
      }, state.doubleClickTimeout);
      return;
    }

    clearTimeout(state.clickTimeoutId);
    state.clickCount = 0;
    addExcludeRelatedDocBlockCondition(defBlock);
  }

  function handleRelatedDocBlockContextmenu(_event, defBlock) {
    addExcludeRelatedDocBlockCondition(defBlock);
  }

  function handleCriteriaConfirm() {
    if (isStrBlank(state.saveCriteriaInputText)) {
      return;
    }
    const savedQueryParams = clonePanelQueryParamsForSave(state.queryParams);
    if (!state.savedQueryParamMap) {
      state.savedQueryParamMap = new Map();
    }
    state.savedQueryParamMap.set(state.saveCriteriaInputText, savedQueryParams);
    BacklinkFilterPanelAttributeService.ins.updatePanelSavedCriteriaMap(
      state.rootId,
      state.savedQueryParamMap,
    );
    state.savedQueryParamMap = state.savedQueryParamMap;
    state.saveCriteriaInputText = "";
    state.showSaveCriteriaInputBox = false;
  }

  function handleCriteriaCancel() {
    state.saveCriteriaInputText = "";
    state.showSaveCriteriaInputBox = false;
  }

  function handleSavedPanelCriteriaClick(name) {
    const savedQueryParam = state.savedQueryParamMap.get(name);
    if (!savedQueryParam) {
      return;
    }
    applySavedPanelCriteria(state.queryParams, savedQueryParam);
    updateRenderData();
  }

  function handleSavedPanelCriteriaDeleteClick(name) {
    state.savedQueryParamMap.delete(name);
    BacklinkFilterPanelAttributeService.ins.updatePanelSavedCriteriaMap(
      state.rootId,
      state.savedQueryParamMap,
    );
    state.savedQueryParamMap = state.savedQueryParamMap;
  }

  function handleBacklinkKeywordInput() {
    clearTimeout(state.inputChangeTimeoutId);
    state.inputChangeTimeoutId = setTimeout(() => {
      updateRenderData();
    }, 450);
  }

  function handleFilterPanelInput() {
    clearTimeout(state.inputChangeTimeoutId);
    state.inputChangeTimeoutId = setTimeout(() => {
      refreshFilterDisplayData();
    }, 100);
  }

  return {
    updateLastCriteria,
    initEvent,
    initBaseData,
    refreshFilterDisplayData,
    clearBacklinkProtyleList,
    clearCacheAndRefresh,
    updateRenderData,
    pageTurning,
    expandAllBacklinkDocument,
    expandAllBacklinkListItemNode,
    collapseAllBacklinkDocument,
    collapseAllBacklinkListItemNode,
    resetFilterQueryParametersToDefault,
    resetBacklinkQueryParametersToDefault,
    handleRelatedDefBlockClick,
    handleRelatedDefBlockContextmenu,
    handleRelatedDocBlockClick,
    handleRelatedDocBlockContextmenu,
    handleCriteriaConfirm,
    handleCriteriaCancel,
    handleSavedPanelCriteriaClick,
    handleSavedPanelCriteriaDeleteClick,
    handleBacklinkKeywordInput,
    handleFilterPanelInput,
  };
}
