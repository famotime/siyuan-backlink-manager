import { getBacklink2, getBacklinkDoc, getBatchBlockIdIndex, getBlockKramdown, getChildBlocks, sql } from "@/utils/api";
import {
    generateGetBacklinkBlockArraySql,
    generateGetBacklinkListItemBlockArraySql,
    generateGetChildBlockArraySql,
    generateGetHeadlineChildDefBlockArraySql,
    generateGetListItemChildBlockArraySql,
    generateGetListItemtSubMarkdownArraySql,
    generateGetParenListItemtDefBlockArraySql,
    generateGetParentDefBlockArraySql,
    generateGetBacklinkSiblingBlockArraySql,
    generateGetBlockArraySql,
} from "./backlink-sql";
import {
    IBacklinkBlockNode,
    IBacklinkBlockQueryParams,
    IBacklinkFilterPanelData,
    IBacklinkFilterPanelDataQueryParams,
    IBacklinkPanelRenderData,
    IPanelRenderBacklinkQueryParams,
    ListItemTreeNode,
} from "@/models/backlink-model";
import {
    countOccurrences,
    isStrBlank,
    isStrNotBlank,
    longestCommonSubstring,
    matchKeywords,
} from "@/utils/string-util";
import { intersectionSet, isArrayEmpty, isArrayNotEmpty, isSetEmpty, isSetNotEmpty } from "@/utils/array-util";
import { CacheManager } from "@/config/CacheManager";
import { SettingService } from "../setting/SettingService";
import { stringToDom } from "@/utils/html-util";
import { getQueryStrByBlock, NewNodeID } from "@/utils/siyuan-util";
import { buildBacklinkDocumentRenderState } from "./backlink-document-pagination.js";
import {
    filterBacklinkDocumentBlocks,
    sanitizeBacklinkRenderQueryParams,
} from "./backlink-filtering.js";
import {
    getMarkdownAnchorTextArray,
    getRefBlockId,
    parseSearchSyntax,
    removeMarkdownRefBlockStyle,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
} from "./backlink-markdown.js";
import {
    applyAnchorsToCurrentDocumentBlocks,
    attachDocumentBlocksToBacklinkNodes,
    buildBacklinkDocumentArray,
    buildRelatedDefBlockArray,
    createBacklinkBlockNode,
    getBlockIds,
} from "./backlink-panel-base-data-builder.js";
import {
    collectBacklinkBlocks,
    collectHeadlineChildBlocks,
    collectListItemTreeNodes,
    collectParentBlocks,
    collectSiblingBlocks,
} from "./backlink-panel-data-collectors.js";
import { buildBacklinkPanelData } from "./backlink-panel-data-assembly.js";
import {
    backlinkBlockNodeArraySort,
    getBatchBacklinkDoc,
    getBacklinkBlockId,
    getBacklinkDocByApiOrCache,
    isBacklinkBlockValid,
} from "./backlink-render-data.js";
import {
    getBacklinkBlockArray,
    getBacklinkEmbedBlockInfo,
    getBlockInfoMap,
    getHeadlineChildBlockArray,
    getListItemChildBlockArray,
    getParentBlockArray,
    getSiblingBlockGroupArray,
} from "./backlink-query-loaders.js";
import {
    applyBacklinkContextBudgetToNodes,
    applyBacklinkContextVisibilityToNodes,
    hydrateBacklinkContextBundles,
} from "./backlink-context.js";
import { normalizeBacklinkContextBudget } from "./backlink-context-budget.js";
import {
    attachBacklinkSourceWindows,
    generateBacklinkSourceWindowBlockArraySql,
    loadOrderedBacklinkSourceWindowBlocks,
} from "./backlink-source-window.js";
import {
    buildBacklinkPanelRenderDataResult,
    buildValidBacklinkRenderNodes,
} from "./backlink-data-pipeline.js";
import { buildBacklinkFetchStageResult } from "./backlink-data-fetch-stage.js";

function shouldLogBacklinkDebug() {
    return globalThis.__BACKLINK_DEBUG__ === true;
}

function logBacklinkDebug(...args: any[]) {
    if (!shouldLogBacklinkDebug()) {
        return;
    }
    console.log(...args);
}

export async function getBacklinkPanelRenderData(
    backlinkPanelData: IBacklinkFilterPanelData,
    queryParams: IPanelRenderBacklinkQueryParams,
): Promise<IBacklinkPanelRenderData> {
    const startTime = performance.now();

    if (!backlinkPanelData || !queryParams) {
        return;
    }
    let pageSize = SettingService.ins.SettingConfig.pageSize;
    let rootId = backlinkPanelData.rootId;

    sanitizeBacklinkRenderQueryParams(queryParams, backlinkPanelData);

    const backlinkBlockNodeArray = backlinkPanelData.backlinkBlockNodeArray;
    const validBacklinkBlockNodeArray: IBacklinkBlockNode[] = buildValidBacklinkRenderNodes({
        backlinkBlockNodeArray,
        queryParams,
        contextBudget: normalizeBacklinkContextBudget({
            maxVisibleFragments:
                SettingService.ins.SettingConfig.backlinkContextMaxVisibleFragments,
            maxVisibleChars:
                SettingService.ins.SettingConfig.backlinkContextMaxVisibleChars,
            maxDepth:
                SettingService.ins.SettingConfig.backlinkContextMaxDepth,
            maxExpandedNodes:
                SettingService.ins.SettingConfig.backlinkContextMaxExpandedNodes,
        }),
        deps: {
            isBacklinkBlockValid: (queryParamsArg, backlinkBlockNode) =>
                isBacklinkBlockValid(queryParamsArg, backlinkBlockNode, {
                    isSetNotEmpty,
                    parseSearchSyntax,
                    getQueryStrByBlock,
                    getMarkdownAnchorTextArray,
                    removeMarkdownRefBlockStyle,
                    matchKeywords,
                }),
            backlinkBlockNodeArraySort: (backlinkBlockNodeArrayArg, blockSortMethod) =>
                backlinkBlockNodeArraySort(
                    backlinkBlockNodeArrayArg,
                    blockSortMethod,
                ),
            applyBacklinkContextVisibilityToNodes,
            applyBacklinkContextBudgetToNodes,
        },
    });
    let pagination = buildBacklinkDocumentRenderState(validBacklinkBlockNodeArray);
    const fetchStageResult = await buildBacklinkFetchStageResult({
        rootId,
        pageBacklinkBlockArray: validBacklinkBlockNodeArray,
        deps: {
            getBatchBacklinkDoc: () => getBatchBacklinkDoc({
                curRootId: rootId,
                backlinkBlockNodeArray: validBacklinkBlockNodeArray,
                deps: {
                    intersectionSet,
                    getBacklinkDocByApiOrCache: (currentRootId, defId, refTreeId, keyword, containChildren) =>
                        getBacklinkDocByApiOrCache(
                            currentRootId,
                            defId,
                            refTreeId,
                            keyword,
                            containChildren,
                            { CacheManager, SettingService, getBacklinkDoc },
                        ),
                    getBacklinkBlockId: (dom) =>
                        getBacklinkBlockId(dom, {
                            isStrBlank,
                            stringToDom,
                            NewNodeID,
                        }),
                    extractTargetBacklinkDom: (dom, blockId) => {
                        const rootElement = stringToDom(dom);
                        if (!rootElement || !blockId) {
                            return "";
                        }
                        const targetElement = rootElement.matches?.(`[data-node-id="${blockId}"]`)
                            ? rootElement
                            : rootElement.querySelector?.(`[data-node-id="${blockId}"]`);
                        return targetElement?.outerHTML || "";
                    },
                    longestCommonSubstring,
                    triggerIncompleteBacklinkFetch: (currentRootId, sourceNodes, backlinks) => {
                        logBacklinkDebug("反链管家插件 疑似 getBacklinkDoc 接口数据不全，如果清除缓存刷新后还是不全，请反馈开发者。 ");
                        logBacklinkDebug("backlinkBlockNodeArray ", sourceNodes, " ,backlinkDcoDataResult ", backlinks);
                        getBacklink2(currentRootId, "", "", "3", "3");
                    },
                },
            }),
            loadOrderedBacklinkSourceWindowBlocks: (backlinkDataArrayArg) => loadOrderedBacklinkSourceWindowBlocks({
                backlinkDataArray: backlinkDataArrayArg,
                deps: {
                    queryDocumentBlocksByRootIds: async (rootIdArray) => {
                        const blockSql = generateBacklinkSourceWindowBlockArraySql(rootIdArray);
                        if (isStrBlank(blockSql)) {
                            return [];
                        }
                        return sql(blockSql);
                    },
                    getBlockIndexMap: getBatchBlockIdIndex,
                    getChildBlocks,
                    getBlockKramdown,
                },
            }),
            attachBacklinkSourceWindows,
        },
    });
    const backlinkDataArray = fetchStageResult.backlinkDataArray;
    const usedCache = fetchStageResult.usedCache;

    let filterBacklinkDocumentArray = filterBacklinkDocumentBlocks(
        backlinkPanelData.backlinkDocumentArray,
        validBacklinkBlockNodeArray,
        queryParams,
    );

    queryParams.pageNum = pagination.pageNum;

    const backlinkPanelRenderDataResult: IBacklinkPanelRenderData = buildBacklinkPanelRenderDataResult({
        rootId,
        backlinkDataArray,
        pagination,
        validBacklinkBlockNodeArray,
        filterCurDocDefBlockArray: [],
        filterRelatedDefBlockArray: [],
        filterBacklinkDocumentArray,
        pageSize,
        usedCache,
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    logBacklinkDebug(`反链面板 生成渲染数据 消耗时间 : ${executionTime} ms `);

    return backlinkPanelRenderDataResult;
}

export async function getTurnPageBacklinkPanelRenderData(
    rootId: string,
    validBacklinkBlockNodeArray: IBacklinkBlockNode[],
    queryParams: IPanelRenderBacklinkQueryParams,
): Promise<IBacklinkPanelRenderData> {
    const startTime = performance.now();
    let pageSize = SettingService.ins.SettingConfig.pageSize;
    backlinkBlockNodeArraySort(
        validBacklinkBlockNodeArray,
        queryParams.backlinkBlockSortMethod,
    );
    let pagination = buildBacklinkDocumentRenderState(validBacklinkBlockNodeArray);
    const fetchStageResult = await buildBacklinkFetchStageResult({
        rootId,
        pageBacklinkBlockArray: validBacklinkBlockNodeArray,
        deps: {
            getBatchBacklinkDoc: () => getBatchBacklinkDoc({
                curRootId: rootId,
                backlinkBlockNodeArray: validBacklinkBlockNodeArray,
                deps: {
                    intersectionSet,
                    getBacklinkDocByApiOrCache: (currentRootId, defId, refTreeId, keyword, containChildren) =>
                        getBacklinkDocByApiOrCache(
                            currentRootId,
                            defId,
                            refTreeId,
                            keyword,
                            containChildren,
                            { CacheManager, SettingService, getBacklinkDoc },
                        ),
                    getBacklinkBlockId: (dom) =>
                        getBacklinkBlockId(dom, {
                            isStrBlank,
                            stringToDom,
                            NewNodeID,
                        }),
                    extractTargetBacklinkDom: (dom, blockId) => {
                        const rootElement = stringToDom(dom);
                        if (!rootElement || !blockId) {
                            return "";
                        }
                        const targetElement = rootElement.matches?.(`[data-node-id="${blockId}"]`)
                            ? rootElement
                            : rootElement.querySelector?.(`[data-node-id="${blockId}"]`);
                        return targetElement?.outerHTML || "";
                    },
                    longestCommonSubstring,
                    triggerIncompleteBacklinkFetch: (currentRootId, sourceNodes, backlinks) => {
                        logBacklinkDebug("反链管家插件 疑似 getBacklinkDoc 接口数据不全，如果清除缓存刷新后还是不全，请反馈开发者。 ");
                        logBacklinkDebug("backlinkBlockNodeArray ", sourceNodes, " ,backlinkDcoDataResult ", backlinks);
                        getBacklink2(currentRootId, "", "", "3", "3");
                    },
                },
            }),
            loadOrderedBacklinkSourceWindowBlocks: (backlinkDataArrayArg) =>
                loadOrderedBacklinkSourceWindowBlocks({
                    backlinkDataArray: backlinkDataArrayArg,
                    deps: {
                        queryDocumentBlocksByRootIds: async (rootIdArray) => {
                            const blockSql = generateBacklinkSourceWindowBlockArraySql(rootIdArray);
                            if (isStrBlank(blockSql)) {
                                return [];
                            }
                            return sql(blockSql);
                        },
                        getBlockIndexMap: getBatchBlockIdIndex,
                        getChildBlocks,
                        getBlockKramdown,
                    },
                }),
            attachBacklinkSourceWindows,
        },
    });
    const backlinkDataArray = fetchStageResult.backlinkDataArray;
    const usedCache = fetchStageResult.usedCache;
    const backlinkPanelRenderDataResult: IBacklinkPanelRenderData = buildBacklinkPanelRenderDataResult({
        rootId,
        backlinkDataArray,
        pagination,
        validBacklinkBlockNodeArray: null,
        filterCurDocDefBlockArray: null,
        filterRelatedDefBlockArray: null,
        filterBacklinkDocumentArray: null,
        pageSize,
        usedCache,
    });
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    logBacklinkDebug(`反链面板 翻页 消耗时间 : ${executionTime} ms `);

    return backlinkPanelRenderDataResult;
}

export async function getBacklinkPanelData(
    queryParams: IBacklinkFilterPanelDataQueryParams
): Promise<IBacklinkFilterPanelData> {
    const startTime = performance.now();
    let rootId = queryParams.rootId;

    let cacheResult = CacheManager.ins.getBacklinkPanelBaseData(rootId);
    if (cacheResult) {
        cacheResult.userCache = true;
        return cacheResult;
    }

    let backlinkBlockQueryParams: IBacklinkBlockQueryParams = {
        rootId: rootId,
        queryParentDefBlock: queryParams.queryParentDefBlock,
        querrChildDefBlockForListItem: queryParams.querrChildDefBlockForListItem,
        queryChildDefBlockForHeadline: queryParams.queryChildDefBlockForHeadline,
    };

    let backlinkBlockArray: BacklinkBlock[] = await getBacklinkBlockArray(
        backlinkBlockQueryParams,
        {
            generateGetBacklinkListItemBlockArraySql,
            generateGetBacklinkBlockArraySql,
            sql,
        },
    );

    if (isArrayEmpty(backlinkBlockArray)) {
        let result: IBacklinkFilterPanelData = {
            rootId: rootId,
            backlinkBlockNodeArray: [],
            curDocDefBlockArray: [],
            relatedDefBlockArray: [],
            backlinkDocumentArray: [],
        };
        return result;
    }

    backlinkBlockQueryParams.backlinkBlocks = backlinkBlockArray;
    backlinkBlockQueryParams.backlinkBlockIds = getBlockIds(backlinkBlockArray);

    let backlinkParentBlockArray: BacklinkParentBlock[] = await getParentBlockArray(
        backlinkBlockQueryParams,
        {
            generateGetParentDefBlockArraySql,
            generateGetParenListItemtDefBlockArraySql,
            sql,
            countOccurrences,
            isSetNotEmpty,
        },
    );

    let headlinkBacklinkChildBlockArray: BacklinkChildBlock[] =
        await getHeadlineChildBlockArray(backlinkBlockQueryParams, {
            generateGetHeadlineChildDefBlockArraySql,
            sql,
            isArrayEmpty,
        });

    let listItemBacklinkChildBlockArray: BacklinkChildBlock[] =
        await getListItemChildBlockArray(backlinkBlockQueryParams, {
            generateGetListItemChildBlockArraySql,
            generateGetListItemtSubMarkdownArraySql,
            sql,
            isSetEmpty,
            isStrNotBlank,
        });

    let backlinkSiblingBlockGroupArray = await getSiblingBlockGroupArray(
        backlinkBlockQueryParams,
        {
            generateGetBacklinkSiblingBlockArraySql,
            generateGetListItemtSubMarkdownArraySql,
            getBlockKramdown,
            getChildBlocks,
            sql,
            isArrayEmpty,
            isStrNotBlank,
        },
    );

    let backlinkPanelData: IBacklinkFilterPanelData = await buildBacklinkPanelData(
        {
            rootId,
            curDocDefBlockArray: [],
            backlinkBlockArray,
            headlinkBacklinkChildBlockArray,
            listItemBacklinkChildBlockArray,
            backlinkParentBlockArray,
            backlinkSiblingBlockGroupArray,
        },
        {
            getBlockIds,
            collectBacklinkBlocks,
            collectHeadlineChildBlocks,
            collectListItemTreeNodes,
            collectParentBlocks,
            collectSiblingBlocks,
            getBacklinkEmbedBlockInfo: (backlinkBlock, curDocDefBlockArrayArg) =>
                getBacklinkEmbedBlockInfo(backlinkBlock, curDocDefBlockArrayArg, {
                    sql,
                    generateGetChildBlockArraySql,
                    getQueryStrByBlock,
                    isArrayNotEmpty,
                    isStrNotBlank,
                }),
            createBacklinkBlockNode,
            updateDynamicAnchorMap,
            updateStaticAnchorMap,
            getRefBlockId,
            updateMaxValueMap,
            updateMapCount,
            ListItemTreeNode,
            isArrayNotEmpty,
            getBlockInfoMap,
            generateGetBlockArraySql,
            sql,
            applyAnchorsToCurrentDocumentBlocks,
            buildRelatedDefBlockArray,
            buildBacklinkDocumentArray,
            attachDocumentBlocksToBacklinkNodes,
            hydrateBacklinkContextBundles,
            getQueryStrByBlock,
            getMarkdownAnchorTextArray,
            removeMarkdownRefBlockStyle,
        },
    );

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    logBacklinkDebug(`反链面板 获取和处理数据 消耗时间 : ${executionTime} ms `);

    let cacheAfterResponseMs = SettingService.ins.SettingConfig.cacheAfterResponseMs;
    let cacheExpirationTime = SettingService.ins.SettingConfig.cacheExpirationTime;

    if (cacheAfterResponseMs >= 0
        && cacheExpirationTime >= 0
        && executionTime > cacheAfterResponseMs) {
        CacheManager.ins.setBacklinkPanelBaseData(rootId, backlinkPanelData, cacheExpirationTime);
    }

    return backlinkPanelData;
}

function updateMaxValueMap(map: Map<string, string>, key: string, value: string) {
    if (!value) {
        return;
    }
    let oldValue = map.get(key);
    if (!oldValue || parseFloat(oldValue) < parseFloat(value)) {
        map.set(key, value);
    }
}

function updateMapCount(map: Map<string, number>, key: string, initialValue = 1) {
    let refCount = map.get(key);
    refCount = refCount ? refCount + 1 : initialValue;
    map.set(key, refCount);
}
