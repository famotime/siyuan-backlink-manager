<script lang="ts">
    import { EnvConfig } from "@/config/EnvConfig";
    import {
        BACKLINK_BLOCK_SORT_METHOD_ELEMENT,
        CUR_DOC_DEF_BLOCK_SORT_METHOD_ELEMENT,
        CUR_DOC_DEF_BLOCK_TYPE_ELEMENT,
        RELATED_DEF_BLOCK_SORT_METHOD_ELEMENT,
        RELATED_DEF_BLOCK_TYPE_ELEMENT,
        RELATED_DOCMUMENT_SORT_METHOD_ELEMENT,
    } from "@/models/backlink-constant";
    import type {
        IBacklinkFilterPanelData,
        IBacklinkFilterPanelDataQueryParams,
        IBacklinkPanelRenderData,
        IPanelRednerFilterQueryParams,
        BacklinkPanelFilterCriteria,
    } from "@/models/backlink-model";
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
        getElementsBeforeDepth,
        highlightElementTextByCss,
        getElementsAtDepth,
        syHasChildListNode,
    } from "@/utils/html-util";
    import {
        isStrBlank,
        splitKeywordStringToArray,
    } from "@/utils/string-util";
    import {
        Constants,
        openMobileFileById,
        Protyle,
        openTab,
    } from "siyuan";
    import type { Custom, TProtyleAction } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { getBlockTypeIconHref } from "@/utils/icon-util";
    import { CacheManager } from "@/config/CacheManager";
    import { BacklinkFilterPanelAttributeService } from "@/service/setting/BacklinkPanelFilterCriteriaService";
    import { SettingService } from "@/service/setting/SettingService";
    import { delayedTwiceRefresh } from "@/utils/timing-util";
    import { getBatchBlockIdIndex, getBlockIsFolded } from "@/utils/api";
    import { getOpenTabActionByZoomIn } from "@/utils/siyuan-util";
    import {
        getCyclicBacklinkIndex,
        groupBacklinksByDocument,
    } from "./backlink-document-navigation.js";
    import {
        buildBacklinkDocumentRenderOptions,
        getBacklinkDocumentClickAction,
        getBacklinkDocumentTargetRole,
        shouldHandleBacklinkDocumentClick,
    } from "./backlink-document-interaction.js";
    import {
        buildBacklinkPaginationState,
        getBacklinkSummaryText,
    } from "./backlink-panel-header.js";
    import {
        createBacklinkDocumentViewState,
        getBacklinkDocumentRenderState,
        markBacklinkDocumentExpanded,
        markBacklinkDocumentFoldState,
        markBacklinkDocumentFullView,
    } from "./backlink-document-view-state.js";
    import {
        buildDefBlockAriaLabel,
        sanitizeBacklinkKeywords,
    } from "./backlink-panel-formatting.js";
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

    export let rootId: string;
    export let focusBlockId: string;
    export let currentTab: Custom;
    // 用来监听变化
    let previousRootId: string;
    let previousFocusBlockId: string;
    // 监听 rootId 变化
    $: if (rootId !== previousRootId || focusBlockId !== previousFocusBlockId) {
        initBaseData();
    }

    /* 绑定 HTML 元素 */
    // let curRootElement: HTMLElement;
    let backlinkULElement: HTMLElement;

    /* 数据 */
    let backlinkFilterPanelBaseData: IBacklinkFilterPanelData;
    let backlinkFilterPanelRenderData: IBacklinkPanelRenderData;
    // 用于排序、关键字查找筛选条件，此时不会改动反链信息，所以在页面中处理。
    let queryParams: IPanelRednerFilterQueryParams;
    let savedQueryParamMap: Map<string, IPanelRednerFilterQueryParams>;

    /* 全局使用 */
    let defalutEditors: Protyle[] = [];
    let doubleClickTimeout: number = 0;
    let clickCount: number = 0;
    let clickTimeoutId: NodeJS.Timeout;
    let inputChangeTimeoutId: NodeJS.Timeout;
    let queryCurDocDefBlockRange: string;
    // 用来保存当前页面反链渲染区的展开折叠状态
    const backlinkDocumentViewState = createBacklinkDocumentViewState();
    let backlinkDocumentFoldMap: Map<string, boolean> =
        backlinkDocumentViewState.documentFoldMap;
    let backlinkDocumentShowFullMap: Map<string, boolean> =
        backlinkDocumentViewState.documentShowFullMap;
    let backlinkProtyleItemFoldMap: Map<string, Set<string>> = new Map();
    let backlinkProtyleHeadingExpandMap: Map<string, boolean> = new Map();
    let backlinkDocumentActiveIndexMap: Map<string, number> =
        backlinkDocumentViewState.documentActiveIndexMap;
    let backlinkDocumentEditorMap: Map<string, Protyle> = new Map();
    let backlinkDocumentGroupArray = [];

    /* 控制页面元素的 */
    let panelFilterViewExpand: boolean = false;
    export let panelBacklinkViewExpand: boolean = true;
    let displayHintPanelBaseDataCacheUsage: boolean = false;
    let displayHintBacklinkBlockCacheUsage: boolean = false;
    let hideBacklinkProtyleBreadcrumb: boolean = false;
    let showSaveCriteriaInputBox: boolean = false;
    let saveCriteriaInputText: string = "";
    let backlinkPaginationState = buildBacklinkPaginationState();

    $: updateLastCriteria(
        queryParams,
        panelFilterViewExpand,
        // panelBacklinkViewExpand,
    );
    $: backlinkPaginationState = buildBacklinkPaginationState(
        backlinkFilterPanelRenderData || {},
    );

    onMount(async () => {
        doubleClickTimeout =
            SettingService.ins.SettingConfig.doubleClickTimeout;
        if (!doubleClickTimeout) {
            doubleClickTimeout = 0;
        }
        if (
            rootId !== previousRootId ||
            focusBlockId !== previousFocusBlockId
        ) {
            initBaseData();
        }

        initEvent();
    });

    onDestroy(async () => {
        clearBacklinkProtyleList();
    });

    function updateLastCriteria(
        queryParams: IPanelRednerFilterQueryParams,
        backlinkPanelFilterViewExpand: boolean,
        // backlinkPanelBacklinkViewExpand: boolean,
    ) {
        if (!rootId || !queryParams) {
            return;
        }
        let criteria: BacklinkPanelFilterCriteria = {
            queryParams,
            backlinkPanelFilterViewExpand,
            // backlinkPanelBacklinkViewExpand,
        };
        BacklinkFilterPanelAttributeService.ins.updatePanelCriteria(
            rootId,
            criteria,
        );
    }

    function initEvent() {
        backlinkULElement.addEventListener("mouseleave", () => {
            clearProtyleGutters(backlinkULElement);
        });
        backlinkULElement.addEventListener("mousemove", (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // 检查是否是移动到文档名称元素上
            if (
                (target && target.classList.contains("b3-list-item__text")) ||
                target.classList.contains("list-item__document-name")
            ) {
                clearProtyleGutters(backlinkULElement);
            }
        });
    }

    function clickBacklinkDocumentLiElement(event: MouseEvent) {
        const target = event.currentTarget as HTMLElement;
        const targetRole = getBacklinkDocumentTargetRole(event.target);
        if (!shouldHandleBacklinkDocumentClick({ targetRole })) {
            return;
        }
        const action = getBacklinkDocumentClickAction({
            ctrlKey: event.ctrlKey,
            targetRole,
        });

        if (action === "open-block") {
            let rootId = target.getAttribute("data-node-id");
            let blockId = target.getAttribute("data-backlink-block-id");
            openBlockTab(rootId, blockId);
            return;
        }

        if (action === "toggle-fold") {
            toggleBacklinkDocument(target);
            return;
        }

        if (action === "show-full-document") {
            showFullBacklinkDocument(target);
        }
    }

    function contextmenuBacklinkDocumentLiElement(event: MouseEvent) {
        const target = event.currentTarget as HTMLElement;
        let rootId = target.getAttribute("data-node-id");
        let blockId = target.getAttribute("data-backlink-block-id");
        openBlockTab(rootId, blockId);
        return;
    }

    function toggleBacklinkDocument(documentLiElement: HTMLElement) {
        let closeStatus = documentLiElement.classList.contains("backlink-hide");
        if (closeStatus) {
            expandBacklinkDocument(documentLiElement);
        } else {
            collapseBacklinkDocument(documentLiElement);
        }
    }

    function expandBacklinkDocument(documentLiElement: HTMLElement) {
        const documentId = documentLiElement.getAttribute("data-node-id");
        markBacklinkDocumentExpanded(backlinkDocumentFoldMap, documentId);
        documentLiElement.nextElementSibling.classList.remove("fn__none");
        documentLiElement.classList.remove("backlink-hide");
        documentLiElement
            .querySelector(".b3-list-item__arrow")
            .classList.add("b3-list-item__arrow--open");
    }

    function collapseBacklinkDocument(documentLiElement: HTMLElement) {
        const documentId = documentLiElement.getAttribute("data-node-id");
        markBacklinkDocumentFoldState(backlinkDocumentFoldMap, documentId, true);
        documentLiElement.nextElementSibling.classList.add("fn__none");
        documentLiElement.classList.add("backlink-hide");
        documentLiElement
            .querySelector(".b3-list-item__arrow")
            .classList.remove("b3-list-item__arrow--open");
    }

    function showFullBacklinkDocument(documentLiElement: HTMLElement) {
        if (!documentLiElement) {
            return;
        }

        const documentId = documentLiElement.getAttribute("data-node-id");
        const editorElement = documentLiElement.nextElementSibling as HTMLElement;
        if (!documentId || !editorElement) {
            return;
        }

        markBacklinkDocumentFullView(backlinkDocumentViewState, documentId);
        expandBacklinkDocument(documentLiElement);

        const documentGroup = backlinkDocumentGroupArray.find(
            (group) => group.documentId === documentId,
        );
        renderBacklinkDocumentGroup(
            documentGroup,
            documentLiElement,
            editorElement,
        );
    }

    function expandAllBacklinkDocument(event: MouseEvent) {
        if (event) {
        }
        // 左键点击展开所有文档
        // if (event.button === 0) {
        let documentLiElementArray = backlinkULElement.querySelectorAll(
            "li.list-item__document-name",
        );
        for (const documentLiElement of documentLiElementArray) {
            expandBacklinkDocument(documentLiElement as HTMLElement);
        }
        return;
        // }
    }

    function expandAllBacklinkListItemNode(event: MouseEvent) {
        if (event) {
        }
        // 右键点击展开所有反链中的列表块
        // if (event.button === 2) {
        let backlinkProtyleElementArray =
            backlinkULElement.querySelectorAll("div.protyle");

        for (const backlinkProtyle of backlinkProtyleElementArray) {
            expandAllListItemNode(backlinkProtyle as HTMLElement);
        }
        return;
        // }
    }

    function collapseAllBacklinkDocument(event: MouseEvent) {
        if (event) {
        }
        // 左键点击折叠所有文档
        // if (event.button === 0) {
        let documentLiElementArray = backlinkULElement.querySelectorAll(
            "li.list-item__document-name",
        );
        for (const documentLiElement of documentLiElementArray) {
            collapseBacklinkDocument(documentLiElement as HTMLElement);
        }
        // }
    }

    function collapseAllBacklinkListItemNode(event: MouseEvent) {
        if (event) {
        }
        // 右键点击折叠所有反链中的列表块
        // if (event.button === 2) {
        let backlinkProtyleElementArray =
            backlinkULElement.querySelectorAll("div.protyle");

        for (const backlinkProtyle of backlinkProtyleElementArray) {
            collapseAllListItemNode(backlinkProtyle as HTMLElement, {
                syHasChildListNode,
            });
        }
        return;
        // }
    }

    // function openDocumentTab(rootId: string) {
    //     let actions: TProtyleAction[] = [Constants.CB_GET_CONTEXT];

    //     if (EnvConfig.ins.isMobile) {
    //         openMobileFileById(EnvConfig.ins.app, rootId, actions);
    //     } else {
    //         openTab({
    //             app: EnvConfig.ins.app,
    //             doc: {
    //                 id: rootId,
    //                 action: actions,
    //             },
    //         });
    //     }
    // }

    async function openBlockTab(rootId: string, blockId: string) {
        let zoomIn = await getBlockIsFolded(blockId);
        let actions: TProtyleAction[] = getOpenTabActionByZoomIn(zoomIn);

        if (EnvConfig.ins.isMobile) {
            openMobileFileById(EnvConfig.ins.app, blockId, actions);
        } else {
            openDestopBlockTab({ zoomIn, actions, rootId, blockId });
        }
    }

    async function openDestopBlockTab(params: {
        zoomIn: boolean;
        actions: TProtyleAction[];
        rootId: string;

        blockId: string;
    }) {
        if (params.rootId == params.blockId) {
            // actions = actions.filter((item) => item !== Constants.CB_GET_HL);
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

    async function initBaseData() {
        if (!rootId) {
            return;
        }
        clearBacklinkProtyleList();
        backlinkDocumentActiveIndexMap.clear();

        previousRootId = rootId;
        previousFocusBlockId = focusBlockId;
        let settingConfig = SettingService.ins.SettingConfig;
        let backlinkPanelDataQueryParams: IBacklinkFilterPanelDataQueryParams =
            {
                rootId,
                focusBlockId,
                queryParentDefBlock: settingConfig.queryParentDefBlock,
                querrChildDefBlockForListItem:
                    settingConfig.querrChildDefBlockForListItem,
                queryChildDefBlockForHeadline:
                    settingConfig.queryChildDefBlockForHeadline,
                queryCurDocDefBlockRange,
            };
        hideBacklinkProtyleBreadcrumb =
            settingConfig.hideBacklinkProtyleBreadcrumb;

        let backlinkPanelBaseDataTemp = await getBacklinkPanelData(
            backlinkPanelDataQueryParams,
        );
        // if (rootId != backlinkPanelBaseDataTemp.rootId) {
        // return;
        // }
        backlinkFilterPanelBaseData = backlinkPanelBaseDataTemp;

        if (
            backlinkFilterPanelBaseData &&
            backlinkFilterPanelBaseData.userCache
        ) {
            displayHintPanelBaseDataCacheUsage = true;
        } else {
            displayHintPanelBaseDataCacheUsage = false;
        }

        let defaultPanelCriteria =
            await BacklinkFilterPanelAttributeService.ins.getPanelCriteria(
                rootId,
            );

        queryParams = defaultPanelCriteria.queryParams;
        panelFilterViewExpand =
            defaultPanelCriteria.backlinkPanelFilterViewExpand;
        // panelBacklinkViewExpand =
        //     defaultPanelCriteria.backlinkPanelBacklinkViewExpand;
        queryParams.pageNum = 1;

        savedQueryParamMap =
            await BacklinkFilterPanelAttributeService.ins.getPanelSavedCriteriaMap(
                rootId,
            );

        if (settingConfig.defaultSelectedViewBlock) {
            let selectBlockId = previousRootId;
            // if (previousFocusBlockId) {
            //     selectBlockId = previousFocusBlockId;
            // }
            let viewBlockExistBacklink = false;
            backlinkFilterPanelBaseData.curDocDefBlockArray.forEach((item) => {
                if (item.id == selectBlockId) {
                    viewBlockExistBacklink = true;
                    return;
                }
            });

            if (viewBlockExistBacklink) {
                // 如果使用这个功能，必须先清空缓存。
                queryParams.includeRelatedDefBlockIds = new Set<string>();
                queryParams.excludeRelatedDefBlockIds = new Set<string>();
                queryParams.includeDocumentIds = new Set<string>();
                queryParams.excludeDocumentIds = new Set<string>();

                queryParams.includeRelatedDefBlockIds.add(selectBlockId);
            }
        }

        updateRenderData();
    }

    async function updateRenderData() {
        let backlinkPanelRenderDataTemp = await getBacklinkPanelRenderData(
            backlinkFilterPanelBaseData,
            queryParams,
        );
        if (backlinkPanelRenderDataTemp.rootId != rootId) {
            return;
        }
        backlinkFilterPanelRenderData = backlinkPanelRenderDataTemp;

        queryParams = queryParams;

        refreshFilterDisplayData();

        refreshBacklinkPreview();
    }

    async function pageTurning(pageNumParam: number) {
        if (
            pageNumParam < 1 ||
            pageNumParam > backlinkFilterPanelRenderData.totalPage
        ) {
            return;
        }
        queryParams.pageNum = pageNumParam;
        let pageBacklinkPanelRenderData =
            await getTurnPageBacklinkPanelRenderData(
                backlinkFilterPanelRenderData.rootId,
                backlinkFilterPanelRenderData.backlinkBlockNodeArray,
                queryParams,
            );

        backlinkFilterPanelRenderData.backlinkDataArray =
            pageBacklinkPanelRenderData.backlinkDataArray;
        backlinkFilterPanelRenderData.pageNum =
            pageBacklinkPanelRenderData.pageNum;
        backlinkFilterPanelRenderData.usedCache =
            pageBacklinkPanelRenderData.usedCache;
        queryParams = queryParams;

        refreshBacklinkPreview();
    }

    async function refreshFilterDisplayData() {
        let curDocDefBlockArray =
            backlinkFilterPanelRenderData.curDocDefBlockArray;
        let relatedDefBlockArray =
            backlinkFilterPanelRenderData.relatedDefBlockArray;
        let backlinkDocumentArray =
            backlinkFilterPanelRenderData.backlinkDocumentArray;
        let realatedDefBLockType = queryParams.filterPanelRelatedDefBlockType;

        // 先匹配关键字
        defBlockArrayTypeAndKeywordFilter(
            curDocDefBlockArray,
            null,
            queryParams.filterPanelCurDocDefBlockKeywords,
        );
        defBlockArrayTypeAndKeywordFilter(
            relatedDefBlockArray,
            realatedDefBLockType,
            queryParams.filterPanelRelatedDefBlockKeywords,
        );
        defBlockArrayTypeAndKeywordFilter(
            backlinkDocumentArray,
            null,
            queryParams.filterPanelBacklinkDocumentKeywords,
        );
        // 排序
        await defBlockArraySort(
            curDocDefBlockArray,
            queryParams.filterPanelCurDocDefBlockSortMethod,
            { getBatchBlockIdIndex },
        );
        await defBlockArraySort(
            relatedDefBlockArray,
            queryParams.filterPanelRelatedDefBlockSortMethod,
            { getBatchBlockIdIndex },
        );
        await defBlockArraySort(
            backlinkDocumentArray,
            queryParams.filterPanelBacklinkDocumentSortMethod,
            { getBatchBlockIdIndex },
        );

        backlinkFilterPanelRenderData = backlinkFilterPanelRenderData;
        // console.log("refreshFilterDisplayData ", backlinkPanelRenderData);
    }

    function refreshBacklinkPreview() {
        clearBacklinkProtyleList();

        batchCreateOfficialBacklinkProtyle(
            backlinkFilterPanelRenderData.backlinkDocumentArray,
            backlinkFilterPanelRenderData.backlinkDataArray,
        );

        if (backlinkFilterPanelRenderData.usedCache) {
            displayHintBacklinkBlockCacheUsage = true;
        } else {
            displayHintBacklinkBlockCacheUsage = false;
        }
    }

    function clearBacklinkProtyleList() {
        let editorsTemp = getEditors();
        if (isArrayNotEmpty(editorsTemp)) {
            editorsTemp.forEach((editor) => {
                // 清理前先保存列表项折叠状态。
                syncBacklinkDocumentProtyleState(editor, {
                    backlinkDocumentFoldMap,
                    backlinkProtyleItemFoldMap,
                    backlinkProtyleHeadingExpandMap,
                    captureBacklinkProtyleState,
                    markBacklinkDocumentFoldState,
                });
                editor.destroy();
            });
        }
        clearEditors();
        backlinkDocumentEditorMap.clear();
        if (backlinkULElement) {
            backlinkULElement.innerHTML = "";
        }
    }

    function emitLoadedProtyleStatic(protyle: Protyle) {
        EnvConfig.ins.plugin.app.plugins.forEach((item) => {
            if (item.name != "syplugin-image-pin-preview") {
                return;
            }
            item.eventBus.emit("loaded-protyle-static", {
                protyle: protyle.protyle,
            });
        });
    }

    function batchCreateOfficialBacklinkProtyle(
        backlinkDocumentArray: DefBlock[],
        backlinkDataArray: IBacklinkData[],
    ) {
        backlinkDocumentGroupArray = batchRenderBacklinkDocumentGroups({
            backlinkDocumentArray,
            backlinkDataArray,
            backlinkDocumentActiveIndexMap,
            backlinkULElement,
            deps: {
                groupBacklinksByDocument,
                isArrayEmpty,
                documentRef: document,
                emptyContentText: window.siyuan.languages.emptyContent,
                createDocumentListItemElement: (documentGroup) =>
                    createBacklinkDocumentListItemElement({
                        documentGroup,
                        parentElement: backlinkULElement,
                        documentRef: document,
                        onDocumentClick: clickBacklinkDocumentLiElement,
                        onContextMenu: contextmenuBacklinkDocumentLiElement,
                        onToggle: toggleBacklinkDocument,
                        onNavigate: navigateBacklinkDocument,
                    }),
                renderDocumentGroup: (documentGroup, documentLiElement, editorElement) =>
                    renderBacklinkDocumentGroup(
                        documentGroup,
                        documentLiElement,
                        editorElement,
                    ),
            },
        });
    }

    function renderBacklinkDocumentGroup(
        documentGroup,
        documentLiElement: HTMLElement,
        editorElement: HTMLElement,
    ) {
        renderBacklinkDocumentGroupByHelper({
            documentGroup,
            documentLiElement,
            editorElement,
            backlinkDocumentEditorMap,
            backlinkDocumentViewState,
            deps: {
                updateBacklinkDocumentLiNavigation,
                syncBacklinkDocumentProtyleState: (editor) =>
                    syncBacklinkDocumentProtyleState(editor, {
                        backlinkDocumentFoldMap,
                        backlinkProtyleItemFoldMap,
                        backlinkProtyleHeadingExpandMap,
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
                            backlinkDocumentViewState,
                            expandBacklinkDocument,
                            collapseBacklinkDocument,
                            expandAllListItemNode,
                            expandBacklinkHeadingMore,
                            backlinkProtyleItemFoldMap,
                            foldListItemNodeByIdSet,
                            defaultExpandedListItemLevel:
                                SettingService.ins.SettingConfig
                                    .defaultExpandedListItemLevel,
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
                        },
                    }),
                addEditor,
            },
        });
    }

    //    function getParentListItemElement(element: Element): Element {
    //        let itemElement = element;
    //        while (
    //            itemElement &&
    //            !itemElement.matches(`div[data-type="NodeListItem"]`)
    //        ) {
    //            itemElement = itemElement.parentElement;
    //        }
    //        return itemElement;
    //    }

    function navigateBacklinkDocument(
        event: MouseEvent,
        direction: "previous" | "next",
    ) {
        event.preventDefault();

        const target = event.currentTarget as HTMLElement;
        const documentLiElement = target.closest(
            ".list-item__document-name",
        ) as HTMLElement;
        if (!documentLiElement) {
            return;
        }

        const documentId = documentLiElement.getAttribute("data-node-id");
        const editorElement = documentLiElement.nextElementSibling as HTMLElement;
        const documentGroup = backlinkDocumentGroupArray.find(
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
        backlinkDocumentActiveIndexMap.set(documentId, nextIndex);
        backlinkDocumentGroupArray = groupBacklinksByDocument(
            backlinkFilterPanelRenderData.backlinkDocumentArray,
            backlinkFilterPanelRenderData.backlinkDataArray,
            backlinkDocumentActiveIndexMap,
        );

        const nextDocumentGroup = backlinkDocumentGroupArray.find(
            (group) => group.documentId === documentId,
        );
        renderBacklinkDocumentGroup(
            nextDocumentGroup,
            documentLiElement,
            editorElement,
        );
    }

    function getDefBlockAriaLabel(
        defBlock: DefBlock,
        showContent: boolean = false,
    ): string {
        return buildDefBlockAriaLabel(
            defBlock,
            window.siyuan.languages,
            showContent,
        );
    }

    function clearCacheAndRefresh() {
        CacheManager.ins.deleteBacklinkPanelAllCache(rootId);
        initBaseData();
    }

    function resetFilterQueryParametersToDefault() {
        let defaultQueryParams =
            BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
        resetFilterQueryParameters(queryParams, defaultQueryParams);
        queryParams = queryParams;
        updateRenderData();
    }

    function resetBacklinkQueryParametersToDefault() {
        let defaultQueryParams =
            BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
        resetBacklinkQueryParameters(queryParams, defaultQueryParams);
        updateRenderData();
    }

    // 处理定义块点击事件
    function handleRelatedDefBlockClick(event, defBlock: DefBlock) {
        if (event) {
        }
        if (event.shiftKey) {
            addExcludeRelatedDefBlockCondition(defBlock);
            return;
        }
        clickCount++;
        if (clickCount === 1) {
            clearTimeout(clickTimeoutId);
            clickTimeoutId = setTimeout(() => {
                // console.log(`关联块左键单击 : ${event.type} ${event.button}`);
                clickCount = 0;
                addIncludeRelatedDefBlockCondition(defBlock);
            }, doubleClickTimeout);
        } else {
            // console.log(`关联块左键双击 : ${event.type} ${event.button}`);
            clearTimeout(clickTimeoutId);
            clickCount = 0;
            addExcludeRelatedDefBlockCondition(defBlock);
        }
    }
    function handleRelatedDefBlockContextmenu(event, defBlock: DefBlock) {
        if (event) {
        }
        // console.log(`关联块右键单击 : ${event.type} ${event.button}`);
        addExcludeRelatedDefBlockCondition(defBlock);
    }

    // 处理文档块点击事件
    function handleRelatedDocBlockClick(event: MouseEvent, defBlock: DefBlock) {
        if (event) {
        }
        if (event.shiftKey) {
            addExcludeRelatedDocBlockCondition(defBlock);
            return;
        }
        clickCount++;
        if (clickCount === 1) {
            clearTimeout(clickTimeoutId);
            clickTimeoutId = setTimeout(() => {
                // console.log(`文档块左键单击 : ${event.type} ${event.button}`);
                clickCount = 0;
                addIncludeRelatedDocBlockCondition(defBlock);
            }, doubleClickTimeout);
        } else {
            // console.log(`文档块左键双击 : ${event.type} ${event.button}`);
            clearTimeout(clickTimeoutId);
            clickCount = 0;
            addExcludeRelatedDocBlockCondition(defBlock);
        }
    }

    function handleRelatedDocBlockContextmenu(event, defBlock: DefBlock) {
        if (event) {
        }
        // console.log(`文档块右键单击 : ${event.type} ${event.button}`);
        addExcludeRelatedDocBlockCondition(defBlock);
    }

    function addIncludeRelatedDefBlockCondition(defBlock: DefBlock) {
        toggleRelatedDefBlockCondition(queryParams, defBlock.id, "include");
        updateRenderData();
    }

    function addExcludeRelatedDefBlockCondition(defBlock: DefBlock) {
        toggleRelatedDefBlockCondition(queryParams, defBlock.id, "exclude");
        updateRenderData();
    }

    function addIncludeRelatedDocBlockCondition(defBlock: DefBlock) {
        toggleRelatedDocumentCondition(queryParams, defBlock.id, "include");
        updateRenderData();
    }

    function addExcludeRelatedDocBlockCondition(defBlock: DefBlock) {
        toggleRelatedDocumentCondition(queryParams, defBlock.id, "exclude");
        updateRenderData();
    }

    function handleCriteriaConfirm() {
        if (isStrBlank(saveCriteriaInputText)) {
            return;
        }
        let savedQueryParams: IPanelRednerFilterQueryParams =
            clonePanelQueryParamsForSave(queryParams);
        if (!savedQueryParamMap) {
            savedQueryParamMap = new Map();
        }
        console.log(
            "handleCriteriaConfirm saveCriteriaInputText : ",
            saveCriteriaInputText,
            " savedQueryParams : ",
            savedQueryParams,
        );
        savedQueryParamMap.set(saveCriteriaInputText, savedQueryParams);
        BacklinkFilterPanelAttributeService.ins.updatePanelSavedCriteriaMap(
            rootId,
            savedQueryParamMap,
        );
        savedQueryParamMap = savedQueryParamMap;

        saveCriteriaInputText = "";
        showSaveCriteriaInputBox = false;
    }
    function handleCriteriaCancel() {
        saveCriteriaInputText = "";
        showSaveCriteriaInputBox = false;
    }
    function hadnleSavedPanelCriteriaClick(name: string) {
        let savedQueryParam = savedQueryParamMap.get(name);
        if (!savedQueryParam) {
            return;
        }
        applySavedPanelCriteria(queryParams, savedQueryParam);

        console.log("hadnleSavedPanelCriteriaClick", queryParams);

        updateRenderData();
    }
    function hadnleSavedPanelCriteriaDeleteClick(name: string) {
        savedQueryParamMap.delete(name);
        BacklinkFilterPanelAttributeService.ins.updatePanelSavedCriteriaMap(
            rootId,
            savedQueryParamMap,
        );
        savedQueryParamMap = savedQueryParamMap;
    }

    function handleBacklinkKeywordInput() {
        // 清除之前的定时器
        clearTimeout(inputChangeTimeoutId);

        inputChangeTimeoutId = setTimeout(() => {
            updateRenderData();
        }, 450);
    }

    function handleFilterPanelInput() {
        // 清除之前的定时器
        clearTimeout(inputChangeTimeoutId);

        inputChangeTimeoutId = setTimeout(() => {
            refreshFilterDisplayData();
        }, 100);
    }

    function getBlockTypeIconHrefByBlock(block: Block) {
        if (!block) {
            return "";
        }
        return getBlockTypeIconHref(block.type, block.subtype);
    }

    function handleKeyDownDefault(event) {
        console.log(event.key);
    }

    function addEditor(editor: Protyle) {
        let editorsTemp = getEditors();
        editorsTemp.push(editor);
    }

    function removeEditor(editor: Protyle) {
        let editorsTemp = getEditors();
        let editorIndex = editorsTemp.indexOf(editor);
        if (editorIndex >= 0) {
            editorsTemp.splice(editorIndex, 1);
        }
    }

    function getEditors(): Protyle[] {
        if (currentTab) {
            return currentTab.editors;
        }
        return defalutEditors;
    }
    function clearEditors() {
        if (currentTab) {
            currentTab.editors = [];
        }
        defalutEditors = [];
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="backlink-panel__area">
    {#if !rootId}
        <p style="padding: 10px 20px;">
            没有获取到当前文档信息，请切换文档重试
        </p>
    {/if}
    {#if displayHintPanelBaseDataCacheUsage}
        <p style="padding: 10px 20px;">此次面板使用了缓存数据</p>
    {/if}
    <div class="backlink-panel__header">
        <div
            class="panel__title filter-panel__title block__icons"
            on:click={() => {
                panelFilterViewExpand = !panelFilterViewExpand;
            }}
            on:keydown={handleKeyDownDefault}
        >
            <div class="block__logo" style="font-weight: bold;">
                <svg class="block__logoicon"
                    ><use xlink:href="#iconFilter"></use></svg
                >筛选面板
            </div>
            <span class="fn__flex-1"></span>
            <span class="fn__space"></span>
            <span
                class="block__icon ariaLabel"
                aria-label="恢复默认"
                on:click|stopPropagation={resetFilterQueryParametersToDefault}
                on:keydown={handleKeyDownDefault}
                ><svg class=""
                    ><use xlink:href="#iconResetInitialization"></use></svg
                ></span
            >
            <span class="fn__space"></span>
            <span class="fn__space"></span>
            <span
                class="block__icon ariaLabel"
                aria-label="清除缓存并刷新"
                on:click|stopPropagation={clearCacheAndRefresh}
                on:keydown={handleKeyDownDefault}
                ><svg class=""><use xlink:href="#iconRefresh"></use></svg></span
            >
            <span class="fn__space"></span>
            <span class="fn__space"></span>
            {#if panelFilterViewExpand}
                <span class="block__icon ariaLabel" aria-label="折叠">
                    <svg><use xlink:href="#iconUp"></use></svg>
                </span>
            {/if}
            {#if !panelFilterViewExpand}
                <span class="block__icon ariaLabel" aria-label="展开">
                    <svg><use xlink:href="#iconDown"></use></svg>
                </span>
            {/if}
        </div>
    </div>
    <!-- 筛选条件区域 -->
    {#if backlinkFilterPanelRenderData && panelFilterViewExpand}
        <div class="backlink-panel-filter">
            <div class="fn__flex">
                <div class="filter-panel__sub_title">定义块范围：</div>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryCurDocDefBlockRange}
                    on:change={initBaseData}
                    style="flex: 0.7;"
                >
                    {#each CUR_DOC_DEF_BLOCK_TYPE_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value == queryCurDocDefBlockRange}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.filterPanelCurDocDefBlockSortMethod}
                    on:change={refreshFilterDisplayData}
                >
                    {#each CUR_DOC_DEF_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value ==
                                queryParams.filterPanelCurDocDefBlockSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleFilterPanelInput}
                    bind:value={queryParams.filterPanelCurDocDefBlockKeywords}
                />
            </div>
            <div>
                <div class="defblock-list">
                    {#each backlinkFilterPanelRenderData.curDocDefBlockArray as defBlock (defBlock.id)}
                        {#if !defBlock.filterStatus}
                            <div
                                id={defBlock.id}
                                class="tag ariaLabel {defBlock.selectionStatus.toLowerCase()}"
                                aria-label={getDefBlockAriaLabel(
                                    defBlock,
                                    true,
                                )}
                                on:click|preventDefault={(event) =>
                                    handleRelatedDefBlockClick(event, defBlock)}
                                on:contextmenu|preventDefault={(event) =>
                                    handleRelatedDefBlockContextmenu(
                                        event,
                                        defBlock,
                                    )}
                                on:keydown={handleKeyDownDefault}
                            >
                                <svg class="b3-list-item__graphic">
                                    <use
                                        xlink:href={getBlockTypeIconHrefByBlock(
                                            defBlock,
                                        )}
                                    ></use>
                                </svg>
                                <span class="block-content">
                                    {defBlock.content}
                                </span>
                                <span class="count">{defBlock.refCount}</span>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
            <div class="fn__flex">
                <div class="filter-panel__sub_title">关联的定义块：</div>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.filterPanelRelatedDefBlockType}
                    on:change={refreshFilterDisplayData}
                    style="flex: 0.5;"
                >
                    {#each RELATED_DEF_BLOCK_TYPE_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value ==
                                queryParams.filterPanelRelatedDefBlockType}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={
                        queryParams.filterPanelRelatedDefBlockSortMethod
                    }
                    on:change={refreshFilterDisplayData}
                >
                    {#each RELATED_DEF_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value ==
                                queryParams.filterPanelRelatedDefBlockSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleFilterPanelInput}
                    bind:value={queryParams.filterPanelRelatedDefBlockKeywords}
                />
            </div>
            <div>
                <div class="defblock-list">
                    {#each backlinkFilterPanelRenderData.relatedDefBlockArray as defBlock (defBlock.id)}
                        {#if !defBlock.filterStatus}
                            <div
                                class="tag ariaLabel {defBlock.selectionStatus.toLowerCase()}"
                                aria-label={getDefBlockAriaLabel(
                                    defBlock,
                                    true,
                                )}
                                on:click={(event) =>
                                    handleRelatedDefBlockClick(event, defBlock)}
                                on:contextmenu|preventDefault={(event) =>
                                    handleRelatedDefBlockContextmenu(
                                        event,
                                        defBlock,
                                    )}
                                on:keydown={handleKeyDownDefault}
                            >
                                <svg class="b3-list-item__graphic">
                                    <use
                                        xlink:href={getBlockTypeIconHrefByBlock(
                                            defBlock,
                                        )}
                                    ></use>
                                </svg>
                                <span class="block-content">
                                    {defBlock.content}
                                </span>
                                <span class="count">{defBlock.refCount}</span>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
            <div class="fn__flex">
                <div class="filter-panel__sub_title">反链所在文档：</div>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={
                        queryParams.filterPanelBacklinkDocumentSortMethod
                    }
                    on:change={refreshFilterDisplayData}
                >
                    {#each RELATED_DOCMUMENT_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value ==
                                queryParams.filterPanelBacklinkDocumentSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleFilterPanelInput}
                    bind:value={queryParams.filterPanelBacklinkDocumentKeywords}
                />
            </div>

            <div>
                <div class="defblock-list">
                    {#each backlinkFilterPanelRenderData.backlinkDocumentArray as defBlock (defBlock.id)}
                        {#if !defBlock.filterStatus}
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="tag ariaLabel {defBlock.selectionStatus.toLowerCase()}"
                                aria-label={getDefBlockAriaLabel(
                                    defBlock,
                                    true,
                                )}
                                on:click={(event) =>
                                    handleRelatedDocBlockClick(event, defBlock)}
                                on:contextmenu|preventDefault={(event) =>
                                    handleRelatedDocBlockContextmenu(
                                        event,
                                        defBlock,
                                    )}
                                on:keydown={handleKeyDownDefault}
                            >
                                <svg class="b3-list-item__graphic">
                                    <use
                                        xlink:href={getBlockTypeIconHrefByBlock(
                                            defBlock,
                                        )}
                                    ></use>
                                </svg>
                                <span class="block-content">
                                    {defBlock.content}
                                </span>
                                <span class="count">{defBlock.refCount}</span>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
            <!-- <hr /> -->
            <div>
                <p>
                    <button
                        style="margin-right: 12px;"
                        class="b3-button save-button"
                        on:click={() => {
                            showSaveCriteriaInputBox = true;
                        }}>保存当前条件</button
                    >
                    {#if savedQueryParamMap}
                        {#each savedQueryParamMap.keys() as name}
                            <div class="tag optional" style="padding: 4px;">
                                <span
                                    class="block-content"
                                    style="min-width:30px;"
                                    on:click={() => {
                                        hadnleSavedPanelCriteriaClick(name);
                                    }}
                                    on:keydown={handleKeyDownDefault}
                                >
                                    {name}
                                </span>
                                <span
                                    class="block__icon"
                                    style="padding: 2px 6px"
                                    on:click={() => {
                                        hadnleSavedPanelCriteriaDeleteClick(
                                            name,
                                        );
                                    }}
                                    on:keydown={handleKeyDownDefault}
                                >
                                    <svg style="width: 8px;"
                                        ><use xlink:href="#iconClose"
                                        ></use></svg
                                    >
                                </span>
                            </div>
                        {/each}
                    {/if}
                </p>
                {#if showSaveCriteriaInputBox}
                    <div class="input-box">
                        <input
                            type="text"
                            bind:value={saveCriteriaInputText}
                            class="b3-text-field input-field"
                            placeholder="请输入名称"
                        />
                        <div class="buttons">
                            <button
                                class="cancel-button b3-button b3-button--outline"
                                on:click={handleCriteriaCancel}>取消</button
                            >
                            <button
                                class="confirm-button b3-button"
                                on:click={handleCriteriaConfirm}>确定</button
                            >
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    <!-- 反链块展示区 -->
    <div class="backlink-panel__header">
        <div
            class="panel__title backlink-panel__title block__icons"
            on:click={() => {
                panelBacklinkViewExpand = !panelBacklinkViewExpand;
            }}
            on:keydown={handleKeyDownDefault}
        >
            <div class="block__logo" style="font-weight: bold;">
                <svg class="block__logoicon"
                    ><use xlink:href="#iconLink"></use></svg
                >反向链接
            </div>
            <span class="fn__flex-1"></span>
            <span class="fn__space"></span>
            <span
                class="block__icon b3-tooltips b3-tooltips__sw"
                aria-label="恢复默认"
                on:click|stopPropagation={resetBacklinkQueryParametersToDefault}
                on:keydown={handleKeyDownDefault}
                ><svg class=""
                    ><use xlink:href="#iconResetInitialization"></use></svg
                ></span
            >
            <span class="fn__space"></span>
            <span class="fn__space"></span>

            {#if panelBacklinkViewExpand}
                <span
                    class="block__icon b3-tooltips b3-tooltips__sw"
                    aria-label="折叠"
                >
                    <svg><use xlink:href="#iconUp"></use></svg>
                </span>
            {/if}
            {#if !panelBacklinkViewExpand}
                <span
                    class="block__icon b3-tooltips b3-tooltips__sw"
                    aria-label="展开"
                >
                    <svg><use xlink:href="#iconDown"></use></svg>
                </span>
            {/if}
        </div>
        {#if panelBacklinkViewExpand && queryParams}
            <div class="fn__flex" style="padding: 5px 15px; maragin:0px;">
                <select
                    class="b3-select fn__flex-center ariaLabel"
                    bind:value={queryParams.backlinkCurDocDefBlockType}
                    on:change={updateRenderData}
                    style="flex: 0.5;"
                    aria-label="当前文档定义块类型"
                >
                    {#each RELATED_DEF_BLOCK_TYPE_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value ==
                                queryParams.backlinkCurDocDefBlockType}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.backlinkBlockSortMethod}
                    on:change={updateRenderData}
                >
                    {#each BACKLINK_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value ==
                                queryParams.backlinkBlockSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleBacklinkKeywordInput}
                    bind:value={queryParams.backlinkKeywordStr}
                />

                <span
                    class="block__icon b3-tooltips b3-tooltips__sw"
                    aria-label="展开所有文档"
                    on:click={expandAllBacklinkDocument}
                    on:contextmenu={expandAllBacklinkListItemNode}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg><use xlink:href="#iconExpand"></use></svg>
                </span>
                <span class="fn__space"></span>
                <span
                    class="block__icon b3-tooltips b3-tooltips__sw"
                    aria-label="折叠所有文档"
                    on:click={collapseAllBacklinkDocument}
                    on:contextmenu={collapseAllBacklinkListItemNode}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg><use xlink:href="#iconContract"></use></svg>
                </span>
            </div>
        {/if}
        {#if panelBacklinkViewExpand && backlinkFilterPanelRenderData && isArrayNotEmpty(backlinkFilterPanelRenderData.backlinkDataArray)}
            <div
                class="block__icons"
                style="overflow:auto;style=color:var(--b3-theme-on-background);"
            >
                <span
                    class="fn__flex-shrink ft__selectnone {backlinkPaginationState.isVisible
                        ? ''
                        : 'fn__none'}"
                >
                    <span class="fn__space"></span>

                    <span class="">
                        {getBacklinkSummaryText(
                            EnvConfig.ins.i18n,
                            backlinkFilterPanelRenderData.backlinkDocumentCount,
                        )}
                    </span>
                </span>
                <span class="fn__space"></span>
                <span class="fn__flex-1" style="min-height: 100%"></span>

                <span
                    class="fn__flex-shrink ft__selectnone backlink-pagination {backlinkPaginationState.isVisible
                        ? ''
                        : 'fn__none'}"
                >
                    <span
                        data-position="9bottom"
                        class="block__icon block__icon--show ariaLabel backlink-nav-button {backlinkPaginationState.previousDisabled
                            ? 'disabled'
                            : ''}"
                        aria-label={EnvConfig.ins.i18n.previousLabel}
                        on:click={() => {
                            pageTurning(backlinkFilterPanelRenderData.pageNum - 1);
                        }}
                        on:keydown={handleKeyDownDefault}
                        ><svg><use xlink:href="#iconLeft"></use></svg></span
                    >
                    <span class="backlink-nav-progress">
                        {backlinkPaginationState.progressText}
                    </span>
                    <span
                        data-position="9bottom"
                        class="block__icon block__icon--show ariaLabel backlink-nav-button {backlinkPaginationState.nextDisabled
                            ? 'disabled'
                            : ''}"
                        aria-label={EnvConfig.ins.i18n.nextLabel}
                        on:click={() => {
                            pageTurning(backlinkFilterPanelRenderData.pageNum + 1);
                        }}
                        on:keydown={handleKeyDownDefault}
                        ><svg><use xlink:href="#iconRight"></use></svg></span
                    >
                </span>
                <span class="fn__space"></span>
            </div>
        {/if}
    </div>
    <div
        class="backlinkList fn__flex-1 {panelBacklinkViewExpand
            ? ''
            : 'fn__none'}"
    >
        <div class="sy__backlink">
            {#if displayHintBacklinkBlockCacheUsage}
                <div>此次查询使用了缓存数据</div>
            {/if}
            <div class="block__icons" style="display: none;"></div>
            <div class="fn__flex-1">
                <ul
                    bind:this={backlinkULElement}
                    class="b3-list b3-list--background {hideBacklinkProtyleBreadcrumb
                        ? 'hide-breadcrumb'
                        : ''}"
                ></ul>
            </div>
        </div>
    </div>
</div>

<style>
    .tag {
        display: inline-flex;
        align-items: center;
        padding: 3px 17px 3px 3px;
        margin: 4px 4px 4px 2px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
        position: relative; /* 为了绝对定位的小数字 */
        max-width: 120px;
        max-height: 30px;
        overflow: hidden; /* 隐藏超出部分的文本 */
        text-overflow: ellipsis; /* 超出部分显示省略号 */
        vertical-align: top; /* 垂直对齐 */
        font-size: 12px;
        white-space: nowrap; /* 禁止换行 */
        opacity: 0.9;
    }

    .selected {
        background-color: rgba(26, 188, 156, 1);
        color: white;
        border: 1px solid rgba(26, 188, 156, 0.4);
    }
    .tag.selected:hover {
        background-color: rgba(26, 188, 156, 0.9);
    }
    .excluded {
        background-color: black;
        color: white;
        border: 1px solid rgba(0, 0, 0, 0.6);
    }
    .tag.excluded:hover {
        background-color: rgba(0, 0, 0, 0.7);
    }
    .optional {
        background-color: var(--b3-theme-background);
        color: var(--b3-theme-on-background);
        border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .tag.optional:hover {
        background-color: rgba(0, 0, 0, 0.08);
    }
    .tag:active {
        transform: scale(0.95);
    }
    .b3-list-item__graphic {
        margin: 1px 0px 0px;
        height: 11px;
        padding: 0px 0px;
    }
    .block-content {
        text-overflow: ellipsis; /* 显示省略号 */
        overflow: hidden; /* 隐藏溢出部分 */
        white-space: nowrap; /* 禁止换行 */
        flex-shrink: 1; /* 允许文本缩小以适应容器 */
    }
    .count {
        position: absolute;
        top: 0px;
        right: 0px;
        /* background: red; */
        /* color: white; */
        border-radius: 20%;
        padding: 2px 5px;
        font-size: 10px;
    }

    .panel__title {
        /* color: var(--b3-theme-on-surface); */
        cursor: pointer;
        border: 0;
        opacity: 1;
        background: rgba(0, 0, 0, 0);
        flex-shrink: 0;
        padding: 2px 10px;
        display: flex;
        align-items: center;
        border-radius: var(--b3-border-radius);
        transition:
            var(--b3-transition),
            opacity 0.3s cubic-bezier(0, 0, 0.2, 1) 0ms;
        line-height: 14px;
        min-height: 25px;
        height: 30px;
        border-radius: 10px;
    }
    .filter-panel__title:hover {
        color: var(--b3-theme-on-background);
        background-color: var(--b3-list-icon-hover);
    }

    .backlink-panel-filter {
        margin: 5px 5px;
        padding: 0px 3px 3px 13px;
        transition:
            transform 0.3s ease,
            box-shadow 0.3s ease;
    }
    /* 悬停效果 */
    .backlink-panel-filter:hover {
        /* border: 1px solid #ccc; */
        /* transform: translateY(-2px); 悬浮效果 */
        /* box-shadow: */
        /* 上边的阴影 */
        /* 0 2px 4px rgba(0, 0, 0, 0.2), */
        /* 四周的阴影 */
        /* 0 3px 10px rgba(0, 0, 0, 0.19); */
    }
    .defblock-list {
        min-height: 33px;
        max-height: 96px; /* 设置最大高度 */
        overflow-y: auto; /* 当内容超过最大高度时显示垂直滚动条 */
        padding: 6px 0px 6px 10px; /* 内边距 */
        /* background-color: var(--b3-list-hover); 背景颜色 */
        border-radius: 6px;
    }

    .backlink-panel__title:hover {
        color: var(--b3-theme-on-background);
        background-color: var(--b3-list-icon-hover);
    }
    select {
        /* max-width: 120px; */
        padding-right: 23px;
        width: 100%;
        flex: 1;
    }
    input {
        /* max-width: 100px; */
        width: 100%;
        flex: 1;
    }
    .filter-panel__sub_title {
        font-size: 1.06em;
        font-weight: bold;
        margin: 6px 0px;
    }
    .block__icon {
        opacity: 1;
    }

    .backlink-nav-progress {
        min-width: 2.75em;
        text-align: center;
    }

    .backlink-pagination {
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .backlink-nav-button {
        cursor: pointer;
    }

    .backlink-nav-button.disabled {
        opacity: 0.38;
        cursor: default;
    }

    .backlink-panel__header {
        position: sticky;
        top: 0;
        text-align: center;
        padding: 0px 0px;
        z-index: 2;
        background-color: var(--b3-theme-surface);
        margin-bottom: 10px;
        border-radius: 10px;
    }

    .backlink-panel__header .b3-text-field:not(.b3-text-field:focus) {
        box-shadow: inset 0 0 0 1px var(--b3-layout-resize);
    }

    .save-button {
        padding: 3px 6px;
        font-size: 11px;
        cursor: pointer;
    }

    .save-button:hover {
        box-shadow:
            0 2px 5px -3px rgb(0 0 0 / 0.2),
            0 5px 10px 1px rgb(0 0 0 / 0.14),
            0 0px 14px 2px rgb(0 0 0 / 0.12);
    }

    .input-box {
        width: 180px;
        position: relative;
        top: 6px;
        /* left: 20px; */

        background: #fff;
        border: 1px solid #ccc;
        padding: 0px 0px 5px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 10px;
    }

    .input-box::before {
        content: "";
        position: relative;
        bottom: 10px;
        left: -60px;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 10px solid white;
    }

    .input-field {
        margin-bottom: 6px;
        padding: 1px;
        width: 80%;
    }

    .buttons {
        display: flex;
        gap: 10px;
    }

    .confirm-button,
    .cancel-button {
        padding: 3px 6px;
        font-size: 11px;
        cursor: pointer;
    }
</style>
