<script lang="ts">
    import type { Custom } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { SettingService } from "@/service/setting/SettingService";
    import {
        createBacklinkDocumentViewState,
    } from "./backlink-document-view-state.js";
    import { createBacklinkPanelController } from "./backlink-panel-controller.js";
    import BacklinkResultsPanel from "./backlink-results-panel.svelte";
    import "./backlink-filter-panel-page.css";

    export let rootId: string;
    export let focusBlockId: string = "";
    export let currentTab: Custom;
    export let panelBacklinkViewExpand = true;

    let backlinkPanelAreaElement: HTMLDivElement;
    let previousRootId: string;
    let previousFocusBlockId: string;
    let backlinkULElement: HTMLElement;
    let backlinkFilterPanelBaseData;
    let backlinkFilterPanelRenderData;
    let queryParams;
    let savedQueryParamMap: Map<string, any>;
    let defalutEditors = [];
    let inputChangeTimeoutId: NodeJS.Timeout;
    const backlinkDocumentViewState = createBacklinkDocumentViewState();
    let backlinkProtyleItemFoldMap = new Map<string, Set<string>>();
    let backlinkProtyleHeadingExpandMap = new Map<string, boolean>();
    let backlinkDocumentEditorMap = new Map();
    let backlinkDocumentGroupArray = [];
    let displayHintPanelBaseDataCacheUsage = false;
    let displayHintBacklinkBlockCacheUsage = false;
    let hideBacklinkProtyleBreadcrumb =
        SettingService.ins.SettingConfig?.hideBacklinkProtyleBreadcrumb ?? false;
    let backlinkGlobalContextVisibilityLevel =
        backlinkDocumentViewState.globalContextVisibilityLevel;
    let unsubscribeSetting: (() => void) | null = null;

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
        get inputChangeTimeoutId() {
            return inputChangeTimeoutId;
        },
        set inputChangeTimeoutId(value) {
            inputChangeTimeoutId = value;
        },
        get backlinkDocumentViewState() {
            return backlinkDocumentViewState;
        },
        get backlinkGlobalContextVisibilityLevel() {
            return backlinkGlobalContextVisibilityLevel;
        },
        set backlinkGlobalContextVisibilityLevel(value) {
            backlinkGlobalContextVisibilityLevel = value;
            backlinkDocumentViewState.globalContextVisibilityLevel = value;
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
    };

    const controller = createBacklinkPanelController(state);

    $: if (rootId !== previousRootId) {
        controller.initBaseData();
    }
    $: controller.updateLastCriteria();

    onMount(() => {
        hideBacklinkProtyleBreadcrumb =
            SettingService.ins.SettingConfig?.hideBacklinkProtyleBreadcrumb ?? false;
        unsubscribeSetting = SettingService.ins.addListener((config) => {
            hideBacklinkProtyleBreadcrumb =
                config.hideBacklinkProtyleBreadcrumb ?? false;
            state.hideBacklinkProtyleBreadcrumb = hideBacklinkProtyleBreadcrumb;
        });

        if (rootId !== previousRootId) {
            controller.initBaseData();
        }
        controller.initEvent();
    });

    onDestroy(() => {
        unsubscribeSetting?.();
        controller.destroyEvent?.();
        controller.clearBacklinkProtyleList();
    });
</script>

<div class="backlink-panel__area" bind:this={backlinkPanelAreaElement}>
    {#if !rootId}
        <p style="padding: 10px 20px;">没有获取到当前文档信息，请切换文档重试</p>
    {/if}
    {#if displayHintPanelBaseDataCacheUsage}
        <p style="padding: 10px 20px;">此次面板使用了缓存数据</p>
    {/if}

    <BacklinkResultsPanel
        bind:panelBacklinkViewExpand
        bind:backlinkULElement
        {queryParams}
        {backlinkFilterPanelRenderData}
        {displayHintBacklinkBlockCacheUsage}
        {hideBacklinkProtyleBreadcrumb}
        {backlinkGlobalContextVisibilityLevel}
        resetBacklinkQueryParametersToDefault={controller.resetBacklinkQueryParametersToDefault}
        refreshBacklinkPanelToCurrentMainDocument={controller.refreshBacklinkPanelToCurrentMainDocument}
        updateRenderData={controller.updateRenderData}
        handleBacklinkKeywordInput={controller.handleBacklinkKeywordInput}
        setAllBacklinkDocumentContextVisibilityLevel={controller.setAllBacklinkDocumentContextVisibilityLevel}
        stepAllBacklinkDocumentContextVisibilityLevel={controller.stepAllBacklinkDocumentContextVisibilityLevel}
        expandAllBacklinkDocument={controller.expandAllBacklinkDocument}
        expandAllBacklinkListItemNode={controller.expandAllBacklinkListItemNode}
        collapseAllBacklinkDocument={controller.collapseAllBacklinkDocument}
        collapseAllBacklinkListItemNode={controller.collapseAllBacklinkListItemNode}
    />
</div>
