<script lang="ts">
    import type { Custom } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { SettingService } from "@/service/setting/SettingService";
    import { getBlockTypeIconHref } from "@/utils/icon-util";
    import {
        createBacklinkDocumentViewState,
    } from "./backlink-document-view-state.js";
    import { buildDefBlockAriaLabel } from "./backlink-panel-formatting.js";
    import { createBacklinkPanelController } from "./backlink-panel-controller.js";
    import BacklinkFilterPanelControls from "./backlink-filter-panel-controls.svelte";
    import BacklinkResultsPanel from "./backlink-results-panel.svelte";
    import "./backlink-filter-panel-page.css";

    export let rootId: string;
    export let focusBlockId: string;
    export let currentTab: Custom;
    export let panelBacklinkViewExpand = true;

    let backlinkPanelAreaElement: HTMLDivElement;
    let filterPanelStickyElement: HTMLDivElement;
    let previousRootId: string;
    let previousFocusBlockId: string;
    let backlinkULElement: HTMLElement;
    let backlinkFilterPanelBaseData;
    let backlinkFilterPanelRenderData;
    let queryParams;
    let savedQueryParamMap: Map<string, any>;
    let defalutEditors = [];
    let doubleClickTimeout = 0;
    let clickCount = 0;
    let clickTimeoutId: NodeJS.Timeout;
    let inputChangeTimeoutId: NodeJS.Timeout;
    let queryCurDocDefBlockRange = "";
    const backlinkDocumentViewState = createBacklinkDocumentViewState();
    let backlinkProtyleItemFoldMap = new Map<string, Set<string>>();
    let backlinkProtyleHeadingExpandMap = new Map<string, boolean>();
    let backlinkDocumentEditorMap = new Map();
    let backlinkDocumentGroupArray = [];
    let panelFilterViewExpand = false;
    let showFilterPanel = SettingService.ins.SettingConfig.enableFilterPanel;
    let displayHintPanelBaseDataCacheUsage = false;
    let displayHintBacklinkBlockCacheUsage = false;
    let hideBacklinkProtyleBreadcrumb = false;
    let showSaveCriteriaInputBox = false;
    let saveCriteriaInputText = "";
    let filterPanelResizeObserver: ResizeObserver;
    let observedFilterPanelStickyElement: HTMLDivElement;

    const state = {
        get rootId() {
            return rootId;
        },
        set rootId(value) {
            rootId = value;
        },
        get focusBlockId() {
            return focusBlockId;
        },
        set focusBlockId(value) {
            focusBlockId = value;
        },
        get currentTab() {
            return currentTab;
        },
        get previousRootId() {
            return previousRootId;
        },
        set previousRootId(value) {
            previousRootId = value;
        },
        get previousFocusBlockId() {
            return previousFocusBlockId;
        },
        set previousFocusBlockId(value) {
            previousFocusBlockId = value;
        },
        get backlinkULElement() {
            return backlinkULElement;
        },
        set backlinkULElement(value) {
            backlinkULElement = value;
        },
        get backlinkFilterPanelBaseData() {
            return backlinkFilterPanelBaseData;
        },
        set backlinkFilterPanelBaseData(value) {
            backlinkFilterPanelBaseData = value;
        },
        get backlinkFilterPanelRenderData() {
            return backlinkFilterPanelRenderData;
        },
        set backlinkFilterPanelRenderData(value) {
            backlinkFilterPanelRenderData = value;
        },
        get queryParams() {
            return queryParams;
        },
        set queryParams(value) {
            queryParams = value;
        },
        get savedQueryParamMap() {
            return savedQueryParamMap;
        },
        set savedQueryParamMap(value) {
            savedQueryParamMap = value;
        },
        get defalutEditors() {
            return defalutEditors;
        },
        set defalutEditors(value) {
            defalutEditors = value;
        },
        get doubleClickTimeout() {
            return doubleClickTimeout;
        },
        set doubleClickTimeout(value) {
            doubleClickTimeout = value;
        },
        get clickCount() {
            return clickCount;
        },
        set clickCount(value) {
            clickCount = value;
        },
        get clickTimeoutId() {
            return clickTimeoutId;
        },
        set clickTimeoutId(value) {
            clickTimeoutId = value;
        },
        get inputChangeTimeoutId() {
            return inputChangeTimeoutId;
        },
        set inputChangeTimeoutId(value) {
            inputChangeTimeoutId = value;
        },
        get queryCurDocDefBlockRange() {
            return queryCurDocDefBlockRange;
        },
        set queryCurDocDefBlockRange(value) {
            queryCurDocDefBlockRange = value;
        },
        get backlinkDocumentViewState() {
            return backlinkDocumentViewState;
        },
        get backlinkDocumentFoldMap() {
            return backlinkDocumentViewState.documentFoldMap;
        },
        get backlinkDocumentActiveIndexMap() {
            return backlinkDocumentViewState.documentActiveIndexMap;
        },
        get backlinkProtyleItemFoldMap() {
            return backlinkProtyleItemFoldMap;
        },
        set backlinkProtyleItemFoldMap(value) {
            backlinkProtyleItemFoldMap = value;
        },
        get backlinkProtyleHeadingExpandMap() {
            return backlinkProtyleHeadingExpandMap;
        },
        set backlinkProtyleHeadingExpandMap(value) {
            backlinkProtyleHeadingExpandMap = value;
        },
        get backlinkDocumentEditorMap() {
            return backlinkDocumentEditorMap;
        },
        set backlinkDocumentEditorMap(value) {
            backlinkDocumentEditorMap = value;
        },
        get backlinkDocumentGroupArray() {
            return backlinkDocumentGroupArray;
        },
        set backlinkDocumentGroupArray(value) {
            backlinkDocumentGroupArray = value;
        },
        get panelFilterViewExpand() {
            return panelFilterViewExpand;
        },
        set panelFilterViewExpand(value) {
            panelFilterViewExpand = value;
        },
        get panelBacklinkViewExpand() {
            return panelBacklinkViewExpand;
        },
        set panelBacklinkViewExpand(value) {
            panelBacklinkViewExpand = value;
        },
        get displayHintPanelBaseDataCacheUsage() {
            return displayHintPanelBaseDataCacheUsage;
        },
        set displayHintPanelBaseDataCacheUsage(value) {
            displayHintPanelBaseDataCacheUsage = value;
        },
        get displayHintBacklinkBlockCacheUsage() {
            return displayHintBacklinkBlockCacheUsage;
        },
        set displayHintBacklinkBlockCacheUsage(value) {
            displayHintBacklinkBlockCacheUsage = value;
        },
        get hideBacklinkProtyleBreadcrumb() {
            return hideBacklinkProtyleBreadcrumb;
        },
        set hideBacklinkProtyleBreadcrumb(value) {
            hideBacklinkProtyleBreadcrumb = value;
        },
        get showSaveCriteriaInputBox() {
            return showSaveCriteriaInputBox;
        },
        set showSaveCriteriaInputBox(value) {
            showSaveCriteriaInputBox = value;
        },
        get saveCriteriaInputText() {
            return saveCriteriaInputText;
        },
        set saveCriteriaInputText(value) {
            saveCriteriaInputText = value;
        },
    };

    const controller = createBacklinkPanelController(state);

    function updateFilterPanelStickyOffset() {
        if (!backlinkPanelAreaElement) {
            return;
        }
        const stickyOffset = filterPanelStickyElement?.offsetHeight || 0;
        backlinkPanelAreaElement.style.setProperty(
            "--backlink-filter-panel-offset",
            `${stickyOffset}px`,
        );
    }

    function syncFilterPanelStickyObserver() {
        if (!filterPanelResizeObserver) {
            updateFilterPanelStickyOffset();
            return;
        }
        if (observedFilterPanelStickyElement === filterPanelStickyElement) {
            updateFilterPanelStickyOffset();
            return;
        }
        if (observedFilterPanelStickyElement) {
            filterPanelResizeObserver.unobserve(observedFilterPanelStickyElement);
        }
        observedFilterPanelStickyElement = filterPanelStickyElement;
        if (observedFilterPanelStickyElement) {
            filterPanelResizeObserver.observe(observedFilterPanelStickyElement);
        }
        updateFilterPanelStickyOffset();
    }

    $: if (rootId !== previousRootId || focusBlockId !== previousFocusBlockId) {
        controller.initBaseData();
    }
    $: controller.updateLastCriteria();
    $: syncFilterPanelStickyObserver();

    onMount(() => {
        doubleClickTimeout =
            SettingService.ins.SettingConfig.doubleClickTimeout || 0;
        if (typeof ResizeObserver !== "undefined") {
            filterPanelResizeObserver = new ResizeObserver(() => {
                updateFilterPanelStickyOffset();
            });
        }
        syncFilterPanelStickyObserver();
        if (rootId !== previousRootId || focusBlockId !== previousFocusBlockId) {
            controller.initBaseData();
        }
        controller.initEvent();
    });

    onDestroy(() => {
        controller.destroyEvent?.();
        filterPanelResizeObserver?.disconnect();
        controller.clearBacklinkProtyleList();
    });

    function getDefBlockAriaLabel(defBlock: DefBlock, showContent = false) {
        return buildDefBlockAriaLabel(
            defBlock,
            window.siyuan.languages,
            showContent,
        );
    }

    function getBlockTypeIconHrefByBlock(block: Block) {
        if (!block) {
            return "";
        }
        return getBlockTypeIconHref(block.type, block.subtype);
    }
</script>

<div class="backlink-panel__area" bind:this={backlinkPanelAreaElement}>
    {#if !rootId}
        <p style="padding: 10px 20px;">没有获取到当前文档信息，请切换文档重试</p>
    {/if}
    {#if displayHintPanelBaseDataCacheUsage}
        <p style="padding: 10px 20px;">此次面板使用了缓存数据</p>
    {/if}

    {#if showFilterPanel}
        <BacklinkFilterPanelControls
            bind:panelFilterViewExpand
            bind:stickyElement={filterPanelStickyElement}
            bind:queryCurDocDefBlockRange
            bind:showSaveCriteriaInputBox
            bind:saveCriteriaInputText
            {backlinkFilterPanelRenderData}
            {queryParams}
            {savedQueryParamMap}
            initBaseData={controller.initBaseData}
            refreshFilterDisplayData={controller.refreshFilterDisplayData}
            resetFilterQueryParametersToDefault={controller.resetFilterQueryParametersToDefault}
            clearCacheAndRefresh={controller.clearCacheAndRefresh}
            handleFilterPanelInput={controller.handleFilterPanelInput}
            handleRelatedDefBlockClick={controller.handleRelatedDefBlockClick}
            handleRelatedDefBlockContextmenu={controller.handleRelatedDefBlockContextmenu}
            handleRelatedDocBlockClick={controller.handleRelatedDocBlockClick}
            handleRelatedDocBlockContextmenu={controller.handleRelatedDocBlockContextmenu}
            handleSavedPanelCriteriaClick={controller.handleSavedPanelCriteriaClick}
            handleSavedPanelCriteriaDeleteClick={controller.handleSavedPanelCriteriaDeleteClick}
            handleCriteriaCancel={controller.handleCriteriaCancel}
            handleCriteriaConfirm={controller.handleCriteriaConfirm}
            {getDefBlockAriaLabel}
            {getBlockTypeIconHrefByBlock}
        />
    {/if}

    <BacklinkResultsPanel
        bind:panelBacklinkViewExpand
        bind:backlinkULElement
        {queryParams}
        {backlinkFilterPanelRenderData}
        {displayHintBacklinkBlockCacheUsage}
        {hideBacklinkProtyleBreadcrumb}
        resetBacklinkQueryParametersToDefault={controller.resetBacklinkQueryParametersToDefault}
        refreshBacklinkPanelToCurrentMainDocument={controller.refreshBacklinkPanelToCurrentMainDocument}
        updateRenderData={controller.updateRenderData}
        handleBacklinkKeywordInput={controller.handleBacklinkKeywordInput}
        expandAllBacklinkDocument={controller.expandAllBacklinkDocument}
        expandAllBacklinkListItemNode={controller.expandAllBacklinkListItemNode}
        collapseAllBacklinkDocument={controller.collapseAllBacklinkDocument}
        collapseAllBacklinkListItemNode={controller.collapseAllBacklinkListItemNode}
    />
</div>
