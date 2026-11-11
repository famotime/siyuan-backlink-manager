/*
 * 思源笔记常用数据结构的全局类型声明（仅保留本项目实际引用的部分）。
 */


type DocumentId = string;
type BlockId = string;
type NotebookId = string;
type PreviousID = BlockId;
type ParentID = BlockId | DocumentId;

// type BlockType = "d" | "s" | "h" | "t" | "i" | "p" | "f" | "audio" | "video" | "other";

type BlockType = "d"  // 文档
    | "h" // 标题
    | "l" // 列表
    | "i" // 列表项
    | "c" // 代码块
    | "m" // 数学公式
    | "t" // 表格
    | "b" // 引述
    | "av" // 属性视图（数据库）
    | "s" // 超级块
    | "p" // 段落
    | "tb" // -- 分隔线
    | "html" // HTML
    | "video" // 视频
    | "audio" // 音频
    | "widget" // 挂件
    | "iframe" // iframe
    | "query_embed" // 嵌入块
    ;

type BlockSubType = "o" | "u" | "t" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type Block = {
    id: BlockId;
    parent_id?: BlockId;
    root_id: DocumentId;
    hash: string;
    box: string;
    path: string;
    hpath: string;
    name: string;
    alias: string;
    memo: string;
    tag: string;
    content: string;
    fcontent?: string;
    markdown: string;
    length: number;
    type: BlockType;
    subtype: BlockSubType;
    /** string of { [key: string]: string }
     * For instance: "{: custom-type=\"query-code\" id=\"20230613234017-zkw3pr0\" updated=\"20230613234509\"}"
     */
    ial?: string;
    sort: number;
    created: string;
    updated: string;
}

interface Window {
    siyuan: {
        config: any;
        notebooks: any;
        menus: any;
        dialogs: any;
        blockPanels: any;
        storage: any;
        user: any;
        ws: any;
        languages: any;
        emojis: any;
    };
}


/**
 * 反链相关
 */


interface IBreadcrumb {
    id: string;
    name: string;
    type: string;
    subType: string;
    children: IBreadcrumb[];
}

interface IBacklinkData {
    blockPaths: IBreadcrumb[];
    dom: string;
    expand: boolean;
    backlinkBlock: Block;
    includeChildListItemIdArray: string[];
    excludeChildListItemIdArray: string[];
    sourceWindow?: {
        rootId: string;
        anchorBlockId: string;
        startBlockId: string;
        endBlockId: string;
        focusBlockId: string;
        zoomInBlockId?: string;
        windowBlockIds?: string[];
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
            bodyRange?: {
                startBlockId?: string;
                endBlockId?: string;
                windowBlockIds?: string[];
            };
            orderedVisibleBlockIds?: string[];
            collapsedBlockIds?: string[];
            structuralShellBlockIds?: string[];
        };
        defaultExpandMode?: string;
    };
}
