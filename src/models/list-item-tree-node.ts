// 注意：本文件需可被 node:test 直接导入（单测环境无 @/ 路径别名），一律使用带扩展名的相对导入
import { getRefBlockId } from "../service/backlink/backlink-markdown.js";
import { isArrayEmpty, isArrayNotEmpty, isSetNotEmpty } from "../utils/array-util.ts";
import { isStrNotBlank } from "../utils/string-util.ts";

/**
 * 列表项树节点：按 parentIdPath 重建列表层级，承载子块 Markdown 与
 * 引用块（定义块）ID 集合，用于关键词匹配与包含/排除过滤的祖先链推导。
 * 自 backlink-model.ts 迁出，模型文件仅保留 re-export 以维持旧导入路径。
 */
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
