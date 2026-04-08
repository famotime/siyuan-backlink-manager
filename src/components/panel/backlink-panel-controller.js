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
  getBacklinkDocumentOpenArea,
  getBacklinkDocumentTargetRole,
  shouldHandleBacklinkDocumentClick,
} from "./backlink-document-interaction.js";
import { createBacklinkPanelOpenActions } from "./backlink-panel-controller-open-actions.js";
import {
  activateBacklinkDocumentMainArea,
  getBacklinkDocumentOpenTarget,
  getBacklinkDocumentPreClickOpenArea,
  getBacklinkDocumentWndElementFromProtyle,
  getBacklinkDocumentWndElementFromTarget,
  mergeBacklinkDocumentOpenTargetIntoTabOptions,
  resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache,
  resolveBacklinkDocumentOpenArea,
} from "./backlink-document-open-target.js";
import {
  createBacklinkDocumentListItemElement,
  updateBacklinkDocumentLiNavigation,
} from "./backlink-document-row.js";
import {
  captureBacklinkProtyleState,
  collapseAllListItemNode,
  expandAllListItemNode,
  expandBacklinkHeadingMore,
  expandListItemNodeByDepth,
  foldListItemNodeByIdSet,
  hideBlocksOutsideBacklinkSourceWindow,
  hideOtherListItemElement,
  navigateToBacklinkBreadcrumbBlock,
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
import { createBacklinkPanelActionHandlers } from "./backlink-panel-controller-actions.js";
import { createBacklinkPanelBulkActions } from "./backlink-panel-controller-bulk.js";
import { createBacklinkPanelRenderBindings } from "./backlink-panel-controller-composition.js";
import { buildBacklinkContextControlState } from "./backlink-panel-header.js";
import { createBacklinkPanelInitCoordinator } from "./backlink-panel-controller-init.js";
import { createBacklinkPanelNavigationActions } from "./backlink-panel-controller-navigation.js";
import {
  cycleBacklinkDocumentVisibilityLevel,
  getBacklinkDocumentRenderState,
  markBacklinkDocumentExpanded,
  markBacklinkDocumentFoldState,
  markBacklinkDocumentFullView,
  markBacklinkDocumentVisibilityLevel,
} from "./backlink-document-view-state.js";
import { sanitizeBacklinkKeywords } from "./backlink-panel-formatting.js";
import { mergeTurnPageBacklinkPanelRenderData } from "./backlink-panel-render-data.js";
import {
  buildBacklinkPanelInitStrategy,
  resolveBacklinkPanelFocusRefresh,
} from "./backlink-panel-focus-refresh.js";
import { createBacklinkPanelDataCoordinator } from "./backlink-panel-controller-data.js";
import { createBacklinkPreviewRenderCoordinator } from "./backlink-panel-controller-rendering.js";
import { resolveBacklinkPanelRefreshRootId } from "./backlink-panel-refresh.js";
import {
  createDocumentGroupRefreshTracker,
  createEditorRegistry,
} from "./backlink-panel-controller-runtime.js";

export function createBacklinkPanelController(state) {
  let preClickOpenArea = "focus";
  let lastKnownFocusedWndElement = null;
  let detachDocumentInteractionTracking = null;
  const editorRegistry = createEditorRegistry(state);
  const { getEditors, addEditor, removeEditor, clearEditors } = editorRegistry;

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

    if (!detachDocumentInteractionTracking) {
      detachDocumentInteractionTracking = attachDocumentInteractionTracking();
    }
  }

  function attachDocumentInteractionTracking() {
    const documentRef = state.backlinkULElement?.ownerDocument || document;
    const eventBus = EnvConfig.ins.plugin?.eventBus;
    if (!documentRef?.addEventListener) {
      return () => {};
    }

    const panelOpenActions = createBacklinkPanelOpenActions({
      state,
      getBacklinkDocumentTargetRole,
      shouldHandleBacklinkDocumentClick,
      getBacklinkDocumentClickAction,
      getBacklinkDocumentOpenArea,
      resolveBacklinkDocumentOpenArea,
      resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache,
      getBacklinkDocumentPreClickOpenArea,
      getBacklinkDocumentWndElementFromTarget,
      getBacklinkDocumentWndElementFromProtyle,
      openBlockTab,
      toggleBacklinkDocument,
      setPreClickOpenArea: (nextValue) => {
        preClickOpenArea = nextValue;
      },
      getPreClickOpenArea: () => preClickOpenArea,
      setLastKnownFocusedWndElement: (nextValue) => {
        lastKnownFocusedWndElement = nextValue;
      },
      getLastKnownFocusedWndElement: () => lastKnownFocusedWndElement,
      currentTab: state.currentTab,
      documentRef,
    });

    const handleFocusIn = panelOpenActions.handleFocusIn;
    const handleMouseDownCapture = panelOpenActions.handleMouseDownCapture;
    const handleProtyleFocus = (event) => {
      panelOpenActions.handleProtyleFocus(event);
      const protyle = event?.detail?.protyle;
      const focusRefresh = resolveBacklinkPanelFocusRefresh({
        rootId: state.rootId,
        focusBlockId: state.focusBlockId,
        protyle,
      });
      if (focusRefresh.shouldRefresh) {
        state.focusBlockId = focusRefresh.nextFocusBlockId;
        initBaseData();
      }
    };

    documentRef.addEventListener("focusin", handleFocusIn, true);
    documentRef.addEventListener("mousedown", handleMouseDownCapture, true);
    eventBus?.on?.("switch-protyle", handleProtyleFocus);
    eventBus?.on?.("loaded-protyle-static", handleProtyleFocus);
    eventBus?.on?.("click-editorcontent", handleProtyleFocus);
    return () => {
      documentRef.removeEventListener("focusin", handleFocusIn, true);
      documentRef.removeEventListener("mousedown", handleMouseDownCapture, true);
      eventBus?.off?.("switch-protyle", handleProtyleFocus);
      eventBus?.off?.("loaded-protyle-static", handleProtyleFocus);
      eventBus?.off?.("click-editorcontent", handleProtyleFocus);
    };
  }

  const panelOpenActions = createBacklinkPanelOpenActions({
    state,
    getBacklinkDocumentTargetRole,
    shouldHandleBacklinkDocumentClick,
    getBacklinkDocumentClickAction,
    getBacklinkDocumentOpenArea,
    resolveBacklinkDocumentOpenArea,
    resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache,
    getBacklinkDocumentPreClickOpenArea,
    getBacklinkDocumentWndElementFromTarget,
    getBacklinkDocumentWndElementFromProtyle,
    openBlockTab,
    toggleBacklinkDocument,
    setPreClickOpenArea: (nextValue) => {
      preClickOpenArea = nextValue;
    },
    getPreClickOpenArea: () => preClickOpenArea,
    setLastKnownFocusedWndElement: (nextValue) => {
      lastKnownFocusedWndElement = nextValue;
    },
    getLastKnownFocusedWndElement: () => lastKnownFocusedWndElement,
    currentTab: state.currentTab,
    documentRef: document,
  });

  function clickBacklinkDocumentLiElement(event) {
    return panelOpenActions.clickBacklinkDocumentLiElement(event);
  }

  function mouseDownBacklinkDocumentLiElement(event) {
    return panelOpenActions.mouseDownBacklinkDocumentLiElement(event);
  }

  function contextmenuBacklinkDocumentLiElement(event) {
    return panelOpenActions.contextmenuBacklinkDocumentLiElement(event);
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

  const panelRenderBindings = createBacklinkPanelRenderBindings({
    state,
    renderBacklinkDocumentGroupByHelper,
    updateBacklinkDocumentLiNavigation,
    getBacklinkContextControlState: (documentGroup) => {
      const renderState = getBacklinkDocumentRenderState(
        state.backlinkDocumentViewState,
        documentGroup?.documentId,
      );
      return buildBacklinkContextControlState({
        contextVisibilityLevel: renderState.contextVisibilityLevel,
        activeBacklink: documentGroup?.activeBacklink || null,
      });
    },
    syncBacklinkDocumentProtyleState,
    captureBacklinkProtyleState,
    markBacklinkDocumentFoldState,
    removeEditor,
    ProtyleCtor: Protyle,
    app: EnvConfig.ins.app,
    buildBacklinkDocumentRenderOptions,
    getBacklinkDocumentRenderState,
    applyCreatedBacklinkProtyleState,
    emitLoadedProtyleStatic,
    expandBacklinkDocument,
    collapseBacklinkDocument,
    expandAllListItemNode,
    expandBacklinkHeadingMore,
    foldListItemNodeByIdSet,
    defaultExpandedListItemLevel:
      SettingService.ins.SettingConfig.defaultExpandedListItemLevel,
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
    attachBacklinkDocumentGroupRefreshTracking: (editor, documentId) =>
      attachBacklinkDocumentGroupRefreshTracking(editor, documentId),
    detachDocumentGroupRefreshTracking: (documentId) =>
      detachDocumentGroupRefreshTracking(documentId),
    groupBacklinksByDocument,
    batchRenderBacklinkDocumentGroups,
    isArrayEmpty,
    documentRef: document,
    emptyContentText: window.siyuan.languages.emptyContent,
    createBacklinkDocumentListItemElement,
    mouseDownBacklinkDocumentLiElement: (event) =>
      mouseDownBacklinkDocumentLiElement(event),
    clickBacklinkDocumentLiElement: (event) =>
      clickBacklinkDocumentLiElement(event),
    contextmenuBacklinkDocumentLiElement: (event) =>
      contextmenuBacklinkDocumentLiElement(event),
    toggleBacklinkDocument,
    navigateBacklinkDocument: (event, direction) =>
      navigateBacklinkDocument(event, direction),
    stepBacklinkDocumentContext: (documentLiElement, direction) =>
      stepBacklinkDocumentContext(documentLiElement, direction),
    navigateBacklinkBreadcrumb: (documentLiElement, blockId) =>
      navigateBacklinkBreadcrumb(documentLiElement, blockId),
  });

  function renderBacklinkDocumentGroup(
    documentGroup,
    documentLiElement,
    editorElement,
  ) {
    return panelRenderBindings.renderBacklinkDocumentGroup(
      documentGroup,
      documentLiElement,
      editorElement,
    );
  }

  function batchCreateOfficialBacklinkProtyle(
    backlinkDocumentArray,
    backlinkDataArray,
  ) {
    return panelRenderBindings.batchCreateOfficialBacklinkProtyle(
      backlinkDocumentArray,
      backlinkDataArray,
    );
  }

  function getBacklinkContextControlState(documentGroup) {
    return panelRenderBindings.getBacklinkContextControlState(documentGroup);
  }

  function clearBacklinkProtyleList() {
    const editors = getEditors();
    detachAllDocumentGroupRefreshTracking();
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

  const panelInitCoordinator = createBacklinkPanelInitCoordinator({
    state,
    SettingService,
    BacklinkFilterPanelAttributeService,
    buildBacklinkPanelInitStrategy,
    getBacklinkPanelData,
    resolveBacklinkPanelRefreshRootId,
    CacheManager,
    clearBacklinkProtyleList,
    updateRenderData: async () => updateRenderData(),
    envConfig: EnvConfig.ins,
  });

  function findBacklinkDocumentRenderTargets(documentId) {
    if (!documentId || !state.backlinkULElement?.querySelectorAll) {
      return { documentLiElement: null, editorElement: null };
    }

    const documentLiElement = Array.from(
      state.backlinkULElement.querySelectorAll("li.list-item__document-name"),
    ).find((element) => element.getAttribute("data-node-id") === documentId);

    return {
      documentLiElement: documentLiElement || null,
      editorElement: documentLiElement?.nextElementSibling || null,
    };
  }

  const previewRenderCoordinator = createBacklinkPreviewRenderCoordinator({
    state,
    clearBacklinkProtyleList,
    batchCreateOfficialBacklinkProtyle,
    findBacklinkDocumentRenderTargets,
    renderBacklinkDocumentGroup,
    groupBacklinksByDocument,
  });

  function refreshBacklinkPreview() {
    return previewRenderCoordinator.refreshBacklinkPreview();
  }

  function refreshBacklinkDocumentGroupById(
    documentId,
    {
      documentLiElement = null,
      editorElement = null,
    } = {},
  ) {
    return previewRenderCoordinator.refreshBacklinkDocumentGroupById(
      documentId,
      {
        documentLiElement,
        editorElement,
      },
    );
  }

  async function refreshBacklinkDocumentGroupDataById(
    documentId,
    {
      focusBlockId = null,
    } = {},
  ) {
    if (
      !documentId ||
      !state.backlinkFilterPanelBaseData ||
      !state.queryParams
    ) {
      return null;
    }

    state.focusBlockId = focusBlockId || state.focusBlockId;
    await loadBacklinkPanelBaseData();
    state.backlinkFilterPanelRenderData = await getBacklinkPanelRenderData(
      state.backlinkFilterPanelBaseData,
      state.queryParams,
    );
    if (state.backlinkFilterPanelRenderData.rootId !== state.rootId) {
      return null;
    }

    state.queryParams = state.queryParams;
    await refreshFilterDisplayData();
    return refreshBacklinkDocumentGroupById(documentId);
  }

  const documentGroupRefreshTracker = createDocumentGroupRefreshTracker({
    state,
    refreshBacklinkDocumentGroupDataById,
  });
  const {
    attachBacklinkDocumentGroupRefreshTracking,
    detachDocumentGroupRefreshTracking,
    detachAllDocumentGroupRefreshTracking,
  } = documentGroupRefreshTracker;

  const panelNavigationActions = createBacklinkPanelNavigationActions({
    state,
    getCyclicBacklinkIndex,
    isArrayEmpty,
    cycleBacklinkDocumentVisibilityLevel,
    markBacklinkDocumentVisibilityLevel,
    getBacklinkDocumentRenderState,
    markBacklinkDocumentFullView,
    expandBacklinkDocument,
    refreshBacklinkDocumentGroupById,
    jumpToBreadcrumbBlockInPreview: navigateToBacklinkBreadcrumbBlock,
  });

  function stepBacklinkDocumentContext(documentLiElement, direction = "next") {
    return panelNavigationActions.stepBacklinkDocumentContext(
      documentLiElement,
      direction,
    );
  }

  const panelBulkActions = createBacklinkPanelBulkActions({
    state,
    expandBacklinkDocument,
    collapseBacklinkDocument,
    expandAllListItemNode,
    collapseAllListItemNode,
    syHasChildListNode,
    markBacklinkDocumentVisibilityLevel,
    refreshBacklinkDocumentGroupById,
    getBacklinkDocumentRenderState,
  });

  function expandAllBacklinkDocument() {
    return panelBulkActions.expandAllBacklinkDocument();
  }

  function expandAllBacklinkListItemNode() {
    return panelBulkActions.expandAllBacklinkListItemNode();
  }

  function collapseAllBacklinkDocument() {
    return panelBulkActions.collapseAllBacklinkDocument();
  }

  function collapseAllBacklinkListItemNode() {
    return panelBulkActions.collapseAllBacklinkListItemNode();
  }

  function setAllBacklinkDocumentContextVisibilityLevel(level) {
    return panelBulkActions.setAllBacklinkDocumentContextVisibilityLevel(level);
  }

  function stepAllBacklinkDocumentContextVisibilityLevel(direction) {
    return panelBulkActions.stepAllBacklinkDocumentContextVisibilityLevel(
      direction,
    );
  }

  async function openDesktopBlockTab(params) {
    if (params.rootId === params.blockId) {
      params.actions = [Constants.CB_GET_FOCUS, Constants.CB_GET_SCROLL];
    }
    const openTarget = getBacklinkDocumentOpenTarget(params.openArea);
    if (openTarget.shouldActivateMainArea) {
      activateBacklinkDocumentMainArea({
        currentTab: state.currentTab,
      });
    }
    const tabOptions = mergeBacklinkDocumentOpenTargetIntoTabOptions({
      app: EnvConfig.ins.app,
      doc: {
        id: params.blockId,
        action: params.actions,
      },
    }, openTarget);
    openTab(tabOptions);
  }

  async function openBlockTab(rootId, blockId, options = {}) {
    const zoomIn = await getBlockIsFolded(blockId);
    const actions = getOpenTabActionByZoomIn(zoomIn);

    if (EnvConfig.ins.isMobile) {
      openMobileFileById(EnvConfig.ins.app, blockId, actions);
      return;
    }

    openDesktopBlockTab({
      zoomIn,
      actions,
      rootId,
      blockId,
      openArea: options.openArea,
    });
  }

  async function loadBacklinkPanelBaseData() {
    return panelInitCoordinator.loadBacklinkPanelBaseData();
  }

  async function initBaseData() {
    return panelInitCoordinator.initBaseData();
  }

  const panelDataCoordinator = createBacklinkPanelDataCoordinator({
    state,
    defBlockArrayTypeAndKeywordFilter,
    defBlockArraySort,
    getBatchBlockIdIndex,
    getBacklinkPanelRenderData,
    getTurnPageBacklinkPanelRenderData,
    mergeTurnPageBacklinkPanelRenderData,
    refreshBacklinkPreview,
  });

  async function refreshFilterDisplayData() {
    return panelDataCoordinator.refreshFilterDisplayData();
  }

  async function updateRenderData() {
    return panelDataCoordinator.updateRenderData();
  }

  async function pageTurning(pageNumParam) {
    return panelDataCoordinator.pageTurning(pageNumParam);
  }

  function navigateBacklinkDocument(event, direction) {
    return panelNavigationActions.navigateBacklinkDocument(event, direction);
  }

  function navigateBacklinkBreadcrumb(documentLiElement, blockId) {
    return panelNavigationActions.navigateBacklinkBreadcrumb(
      documentLiElement,
      blockId,
    );
  }

  function clearCacheAndRefresh() {
    return panelInitCoordinator.clearCacheAndRefresh();
  }

  function refreshBacklinkPanelToCurrentMainDocument() {
    return panelInitCoordinator.refreshBacklinkPanelToCurrentMainDocument();
  }

  const panelActionHandlers = createBacklinkPanelActionHandlers({
    state,
    BacklinkFilterPanelAttributeService,
    resetFilterQueryParameters,
    resetBacklinkQueryParameters,
    toggleRelatedDefBlockCondition,
    toggleRelatedDocumentCondition,
    clonePanelQueryParamsForSave,
    applySavedPanelCriteria,
    isStrBlank,
    updateRenderData,
    refreshFilterDisplayData,
  });

  function resetFilterQueryParametersToDefault() {
    return panelActionHandlers.resetFilterQueryParametersToDefault();
  }

  function resetBacklinkQueryParametersToDefault() {
    return panelActionHandlers.resetBacklinkQueryParametersToDefault();
  }

  function handleRelatedDefBlockClick(event, defBlock) {
    return panelActionHandlers.handleRelatedDefBlockClick(event, defBlock);
  }

  function handleRelatedDefBlockContextmenu(_event, defBlock) {
    return panelActionHandlers.handleRelatedDefBlockContextmenu(_event, defBlock);
  }

  function handleRelatedDocBlockClick(event, defBlock) {
    return panelActionHandlers.handleRelatedDocBlockClick(event, defBlock);
  }

  function handleRelatedDocBlockContextmenu(_event, defBlock) {
    return panelActionHandlers.handleRelatedDocBlockContextmenu(_event, defBlock);
  }

  function handleCriteriaConfirm() {
    return panelActionHandlers.handleCriteriaConfirm();
  }

  function handleCriteriaCancel() {
    return panelActionHandlers.handleCriteriaCancel();
  }

  function handleSavedPanelCriteriaClick(name) {
    return panelActionHandlers.handleSavedPanelCriteriaClick(name);
  }

  function handleSavedPanelCriteriaDeleteClick(name) {
    return panelActionHandlers.handleSavedPanelCriteriaDeleteClick(name);
  }

  function handleBacklinkKeywordInput() {
    return panelActionHandlers.handleBacklinkKeywordInput();
  }

  function handleFilterPanelInput() {
    return panelActionHandlers.handleFilterPanelInput();
  }

  return {
    updateLastCriteria,
    initEvent,
    destroyEvent() {
      detachAllDocumentGroupRefreshTracking();
      detachDocumentInteractionTracking?.();
      detachDocumentInteractionTracking = null;
    },
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
    setAllBacklinkDocumentContextVisibilityLevel,
    stepAllBacklinkDocumentContextVisibilityLevel,
    resetFilterQueryParametersToDefault,
    resetBacklinkQueryParametersToDefault,
    refreshBacklinkPanelToCurrentMainDocument,
    refreshBacklinkDocumentGroupById,
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
