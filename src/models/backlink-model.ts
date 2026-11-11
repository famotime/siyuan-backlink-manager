// 带行为的逻辑类已迁出至独立文件，此处 re-export 维持旧导入路径兼容
import type { ListItemTreeNode } from "./list-item-tree-node";

export { ListItemTreeNode } from "./list-item-tree-node";
export { BacklinkPanelFilterCriteria } from "./backlink-panel-filter-criteria";

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

export interface IPanelRenderFilterQueryParams extends IPanelRenderBacklinkQueryParams {
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
