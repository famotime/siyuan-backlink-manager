import { getRefBlockId } from "@/service/backlink/backlink-markdown.js";
import { isArrayEmpty, isArrayNotEmpty, isSetNotEmpty } from "@/utils/array-util";
import { isStrNotBlank } from "@/utils/string-util";

export interface IBacklinkFilterPanelDataQueryParams {
    rootId: string;
    focusBlockId?: string;
    queryParentDefBlock?: boolean;
    querrChildDefBlockForListItem?: boolean;
    queryChildDefBlockForHeadline?: boolean;
    queryCurDocDefBlockRange?: string;
}

export interface IBacklinkBlockQueryParams {
    rootId?: string;
    queryParentDefBlock?: boolean;
    querrChildDefBlockForListItem?: boolean;
    queryChildDefBlockForHeadline?: boolean;
    defBlockIds?: string[];
    backlinkBlockIds?: string[];
    backlinkBlocks?: BacklinkBlock[];
    backlinkAllParentBlockIds?: string[];
    backlinkParentListItemBlockIds?: string[];
}

export type BacklinkContextSourceType =
    | "self"
    | "document"
    | "parent"
    | "child_headline"
    | "child_list"
    | "sibling_prev"
    | "sibling_next"
    | "expanded";

export type BacklinkContextVisibilityLevel =
    | "core"
    | "nearby"
    | "extended"
    | "full";

export interface IBacklinkContextFragment {
    id: string;
    backlinkBlockId: string;
    rootId: string;
    sourceType: BacklinkContextSourceType;
    visibilityLevel: BacklinkContextVisibilityLevel;
    text: string;
    renderMarkdown?: string;
    displayText: string;
    searchText: string;
    anchorText: string;
    refBlockIds: string[];
    includeCurDocDefBlockIds: string[];
    includeRelatedDefBlockIds: string[];
    searchable: boolean;
    filterable: boolean;
    defaultVisible: boolean;
    budgetPriority: number;
    matched: boolean;
    matchTypes: string[];
    matchKeywords: string[];
    order: number;
}

export interface IBacklinkContextSourceRule {
    label: string;
    visibilityLevel: BacklinkContextVisibilityLevel;
    defaultVisible: boolean;
    searchable: boolean;
    filterable: boolean;
    budgetPriority: number;
    matchPriority: number;
}

export interface IBacklinkContextMetaInfoField {
    key: string;
    text: string;
    renderMarkdown?: string;
    searchText: string;
    visibilityRole: "meta";
    searchable: boolean;
    matched: boolean;
    matchTypes: string[];
    matchKeywords: string[];
}

export interface IBacklinkContextMetaInfo {
    documentTitle?: IBacklinkContextMetaInfoField;
    headingPath?: IBacklinkContextMetaInfoField;
    listPath?: IBacklinkContextMetaInfoField;
    matchedFieldKeys: string[];
    matchSummaryList: string[];
    primaryMatchKey?: string;
}

export interface IBacklinkContextBundle {
    backlinkBlockId: string;
    rootId: string;
    fragments: IBacklinkContextFragment[];
    explanationFragments: IBacklinkContextFragment[];
    visibleFragments: IBacklinkContextFragment[];
    metaInfo: IBacklinkContextMetaInfo;
    matchedFragments: IBacklinkContextFragment[];
    includeCurDocDefBlockIds: Set<string>;
    includeRelatedDefBlockIds: Set<string>;
    matchSummaryList: string[];
    primaryMatchSourceType?: BacklinkContextSourceType;
    budgetSummary?: IBacklinkContextBudgetSummary;
}

export interface IBacklinkContextBudgetSummary {
    maxVisibleFragments: number;
    maxVisibleChars: number;
    totalCandidateFragments: number;
    omittedFragmentCount: number;
    preservedMatchedFragmentCount: number;
    visibleCharacterCount: number;
    truncated: boolean;
}

export interface IBacklinkSourceWindow {
    rootId: string;
    anchorBlockId: string;
    startBlockId: string;
    endBlockId: string;
    focusBlockId: string;
    zoomInBlockId?: string;
    windowBlockIds: string[];
    visibleBlockIds?: string[];
    orderedVisibleBlockIds?: string[];
    contextPlan?: {
        identity?: {
            rootId?: string;
            anchorBlockId?: string;
            focusBlockId?: string;
            zoomInBlockId?: string;
            sourceDocumentOrder?: number;
        };
        bodyRange: {
            startBlockId: string;
            endBlockId: string;
            windowBlockIds: string[];
        };
        orderedVisibleBlockIds: string[];
        collapsedBlockIds: string[];
        structuralShellBlockIds: string[];
    };
    defaultExpandMode: string;
}

export interface IBacklinkBlockNode {
    block: DefBlock;
    documentBlock: DefBlock;
    selfRenderMarkdown?: string;
    parentMarkdown: string;
    parentRenderMarkdown?: string;
    listItemChildMarkdown: string;
    headlineChildMarkdown: string;
    previousSiblingMarkdown: string;
    nextSiblingMarkdown: string;
    previousSiblingRenderMarkdown?: string;
    nextSiblingRenderMarkdown?: string;
    beforeExpandedMarkdown?: string;
    beforeExpandedRenderMarkdown?: string;
    expandedMarkdown?: string;
    expandedRenderMarkdown?: string;
    afterExpandedMarkdown?: string;
    afterExpandedRenderMarkdown?: string;
    includeDirectDefBlockIds: Set<string>;
    includeRelatedDefBlockIds: Set<string>;
    includeCurBlockDefBlockIds: Set<string>;
    includeParentDefBlockIds: Set<string>;
    dynamicAnchorMap: Map<string, Set<string>>;
    staticAnchorMap: Map<string, Set<string>>;
    parentListItemTreeNode?: ListItemTreeNode;
    parentContextBlockIds?: string[];
    previousSiblingBlockId?: string;
    nextSiblingBlockId?: string;
    beforeExpandedBlockIdArray?: string[];
    afterExpandedBlockIdArray?: string[];
    contextFragments?: IBacklinkContextFragment[];
    contextBundle?: IBacklinkContextBundle;
}

export class ListItemTreeNode {
    id: string;
    parentId: string;
    type: string;
    parentIdPath: string;
    parentInAttrConcat: string;
    subMarkdown: string;
    subInAttrConcat: string;
    includeDefBlockIds: Set<string>;
    children: ListItemTreeNode[];
    excludeChildIdArray: string[];
    includeChildIdArray: string[];

    constructor(id: string) {
        this.id = id;
        this.children = [];
    }

    existsKeywords(keywordArray: string[]): boolean {
        if (!keywordArray || keywordArray.length == 0) {
            return true;
        }
        let newKeywordArray = keywordArray.slice();
        for (const keywordStr of keywordArray) {
            if (this.subMarkdown.includes(keywordStr)) {
                newKeywordArray = newKeywordArray.filter(element => element !== keywordStr);
            }
        }
        if (newKeywordArray.length == 0) {
            return true;
        }
        for (const child of this.children) {
            const childMatches = child.existsKeywords(newKeywordArray);
            if (childMatches) {
                return true;
            }
        }
        return newKeywordArray.length == 0;
    }

    resetExcludeItemIdArray(parentDefBlockIdArray: string[], excludeDefBlockIdArray: string[]): string[] {
        let result = [];
        if (isArrayEmpty(excludeDefBlockIdArray)) {
            this.excludeChildIdArray = result;
            return result;
        }
        let newParentDefBlockIdArray = [...parentDefBlockIdArray];
        if (isSetNotEmpty(this.includeDefBlockIds)) {
            newParentDefBlockIdArray.push(...this.includeDefBlockIds);
        }
        if (isSetNotEmpty(this.includeDefBlockIds)) {
            let exclude = excludeDefBlockIdArray.some(value => newParentDefBlockIdArray.includes(value));
            if (exclude) {
                result.push(this.id);
                this.excludeChildIdArray = result;
                return result;
            }
        }
        if (isArrayNotEmpty(this.children)) {
            this.children.forEach(item => {
                let itemResult = item.resetExcludeItemIdArray(newParentDefBlockIdArray, excludeDefBlockIdArray);
                if (itemResult) {
                    result = result.concat(itemResult);
                }
            });
        }
        this.excludeChildIdArray = result;
        return result;
    }

    resetIncludeItemIdArray(parentDefBlockIdArray: string[], includeDefBlockIdArray: string[]): string[] {
        let itemArray = this.getIncludeItemArray(parentDefBlockIdArray, includeDefBlockIdArray);
        let itemIdSet = new Set<string>();
        for (const item of itemArray) {
            itemIdSet.add(item.id);
            if (item.parentIdPath) {
                let parentIdArray = item.parentIdPath.split("->");
                for (const parentId of parentIdArray) {
                    itemIdSet.add(parentId);
                }
            }
            let childIdArray = item.getAllChildIds();
            for (const childId of childIdArray) {
                itemIdSet.add(childId);
            }
        }
        this.includeChildIdArray = Array.from(itemIdSet);
        return this.includeChildIdArray;
    }

    getIncludeItemArray(parentDefBlockIdArray: string[], includeDefBlockIdArray: string[]): ListItemTreeNode[] {
        let result: ListItemTreeNode[] = [];
        let newParentDefBLockIdArray = [...parentDefBlockIdArray];
        if (isSetNotEmpty(this.includeDefBlockIds)) {
            newParentDefBLockIdArray.push(...this.includeDefBlockIds);
        }

        if (isArrayEmpty(includeDefBlockIdArray)) {
            result.push(this);
            return result;
        }
        if (isSetNotEmpty(this.includeDefBlockIds)) {
            let includeAll = includeDefBlockIdArray.every(value => newParentDefBLockIdArray.includes(value));
            if (includeAll) {
                result.push(this);
                return result;
            }
        }
        if (isArrayNotEmpty(this.children)) {
            this.children.forEach(item => {
                let itemResult = item.getIncludeItemArray(newParentDefBLockIdArray, includeDefBlockIdArray);
                if (itemResult) {
                    result = result.concat(itemResult);
                }
            });
        }
        return result;
    }

    getAllChildIds(): string[] {
        let ids: string[] = [];
        this.children.forEach(child => {
            ids.push(child.id);
            ids = ids.concat(child.getAllChildIds());
        });
        return ids;
    }

    getAllDefBlockIds(): string[] {
        return this.getFilterDefBlockIds(null, null);
    }

    getFilterDefBlockIds(includeChildIdArray: string[], excludeChildIdArray: string[]): string[] {
        let childMarkdown = this.getFilterMarkdown(includeChildIdArray, excludeChildIdArray);
        let defBlockIds = getRefBlockId(childMarkdown);
        return defBlockIds;
    }

    getAllMarkdown(): string {
        return this.getFilterMarkdown(null, null);
    }

    getFilterMarkdown(includeChildIdArray: string[], excludeChildIdArray: string[]): string {
        let markdown: string = isStrNotBlank(this.subMarkdown) ? this.subMarkdown : "";
        markdown += isStrNotBlank(this.parentInAttrConcat) ? this.parentInAttrConcat : "";
        markdown += isStrNotBlank(this.subInAttrConcat) ? this.subInAttrConcat : "";

        for (const child of this.children) {
            if (isArrayNotEmpty(excludeChildIdArray) && excludeChildIdArray.includes(child.id)) {
                continue;
            }
            if (isArrayNotEmpty(includeChildIdArray) && !includeChildIdArray.includes(child.id)) {
                continue;
            }
            let childMarkdown = child.getFilterMarkdown(includeChildIdArray, excludeChildIdArray);
            markdown += childMarkdown;
        }

        return markdown;
    }

    static buildTree(data: BacklinkChildBlock[]): ListItemTreeNode[] | null {
        const rootNodes: Record<string, ListItemTreeNode> = {};

        data.forEach(item => {
            const pathIds = item.parentIdPath.split('->');
            let currentNode: ListItemTreeNode | undefined = rootNodes[pathIds[0]];

            if (!currentNode) {
                currentNode = new ListItemTreeNode(pathIds[0]);
                rootNodes[pathIds[0]] = currentNode;
            }

            for (let i = 1; i < pathIds.length; i++) {
                const nodeId = pathIds[i];
                let childNode = currentNode.children.find(node => node.id === nodeId);

                if (!childNode) {
                    childNode = new ListItemTreeNode(nodeId);
                    currentNode.children.push(childNode);
                }

                currentNode = childNode;
            }

            if (currentNode) {
                currentNode.parentId = item.parent_id;
                currentNode.type = item.type;
                currentNode.parentIdPath = item.parentIdPath;
                currentNode.parentInAttrConcat = item.parentInAttrConcat;
                currentNode.subMarkdown = item.subMarkdown;
                currentNode.subInAttrConcat = item.subInAttrConcat;
                currentNode.includeDefBlockIds = new Set(getRefBlockId(currentNode.subMarkdown));
            }
        });

        const rootNodeArray = Object.values(rootNodes);
        return rootNodeArray;
    }
}

export interface IBacklinkFilterPanelData {
    rootId?: string;
    backlinkBlockNodeArray: IBacklinkBlockNode[];
    curDocDefBlockArray?: DefBlock[];
    relatedDefBlockArray?: DefBlock[];
    backlinkDocumentArray?: DefBlock[];
    userCache?: boolean;
}

export interface IPanelRenderBacklinkQueryParams {
    pageNum: number;
    pageSize: number;
    backlinkContextVisibilityLevel?: BacklinkContextVisibilityLevel;
    backlinkCurDocDefBlockType?: string;
    backlinkBlockSortMethod: BlockSortMethod;
    backlinkKeywordStr: string;
    includeRelatedDefBlockIds?: Set<string>;
    excludeRelatedDefBlockIds?: Set<string>;
    includeDocumentIds?: Set<string>;
    excludeDocumentIds?: Set<string>;
}

export interface IPanelRednerFilterQueryParams extends IPanelRenderBacklinkQueryParams {
    filterPanelCurDocDefBlockSortMethod?: BlockSortMethod;
    filterPanelCurDocDefBlockKeywords?: string;
    filterPanelRelatedDefBlockType?: string;
    filterPanelRelatedDefBlockSortMethod?: BlockSortMethod;
    filterPanelRelatedDefBlockKeywords?: string;
    filterPanelBacklinkDocumentSortMethod?: BlockSortMethod;
    filterPanelBacklinkDocumentKeywords?: string;
}

export interface IBacklinkPanelRenderData {
    rootId: string;
    backlinkDataArray: IBacklinkData[];
    backlinkDocumentCount: number;
    backlinkBlockNodeArray: IBacklinkBlockNode[];
    curDocDefBlockArray?: DefBlock[];
    relatedDefBlockArray?: DefBlock[];
    backlinkDocumentArray?: DefBlock[];
    pageNum: number;
    pageSize: number;
    totalPage: number;
    usedCache: boolean;
}

export class BacklinkPanelFilterCriteria {
    queryParams: IPanelRednerFilterQueryParams;
    backlinkPanelFilterViewExpand?: boolean;
}
