import { isArrayEmpty } from "./array-util";
import { isStrBlank } from "./string-util";
import { logInfo } from "./logger";

export async function highlightElementTextByCss(
    contentElement: HTMLElement,
    keywordArray: string[],

) {
    if (!contentElement || isArrayEmpty(keywordArray)) {
        return;
    }
    // If the CSS Custom Highlight API is not supported,
    // display a message and bail-out.
    if (!CSS.highlights) {
        logInfo("CSS Custom Highlight API not supported.");
        return;
    }

    // Find all text nodes in the article. We'll search within
    // these text nodes.
    const treeWalker = document.createTreeWalker(
        contentElement,
        NodeFilter.SHOW_TEXT,
    );
    const allTextNodes: Node[] = [];
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
        allTextNodes.push(currentNode);
        currentNode = treeWalker.nextNode();
    }

    // Clean-up the search query and bail-out if
    // if it's empty.

    let allMatchRanges: Range[] = [];

    // Iterate over all text nodes and find matches.
    allTextNodes
        .map((el: Node) => {
            return { el, text: el.textContent.toLowerCase() };
        })
        .map(({ el, text }) => {
            const indices: { index: number; length: number }[] = [];
            for (const queryStr of keywordArray) {
                if (!queryStr) {
                    continue;
                }
                let startPos = 0;
                while (startPos < text.length) {
                    const index = text.indexOf(
                        queryStr.toLowerCase(),
                        startPos,
                    );
                    if (index === -1) break;
                    let length = queryStr.length;
                    indices.push({ index, length });
                    startPos = index + length;
                }
            }

            indices
                .sort((a, b) => a.index - b.index)
                .map(({ index, length }) => {
                    const range = new Range();
                    range.setStart(el, index);
                    range.setEnd(el, index + length);
                    allMatchRanges.push(range);

                });
        });

    // Create a Highlight object for the ranges.
    allMatchRanges = allMatchRanges.flat();
    if (!allMatchRanges || allMatchRanges.length <= 0) {
        return;
    }

    let searchResultsHighlight = CSS.highlights.get("search-result-mark");
    if (searchResultsHighlight) {
        for (const range of allMatchRanges) {
            searchResultsHighlight.add(range);
        }
    } else {
        searchResultsHighlight = new Highlight(...allMatchRanges);
    }

    // Register the Highlight object in the registry.
    CSS.highlights.set("search-result-mark", searchResultsHighlight);

}

export function clearProtyleGutters(target: HTMLElement) {
    if (!target) {
        return;
    }
    target.querySelectorAll(".protyle-gutters").forEach((item) => {
        item.classList.add("fn__none");
        item.innerHTML = "";
    });
}

export function getElementsBeforeDepth(rootElement: HTMLElement, selector: string, depth: number) {
    const result = [];

    function recursiveSearch(node: Element, currentDepth: number) {
        if (currentDepth > depth || syHasChildListNode(node)) {
            return;
        }
        const targetElements = node.querySelectorAll(':scope > ' + selector);
        for (const element of targetElements) {
            result.push(element);
            const childNodes = element.children;
            for (let i = 0; i < childNodes.length; i++) {
                recursiveSearch(childNodes[i], currentDepth + 1);
            }
        }

    }

    recursiveSearch(rootElement, 0)

    return result;
}


export function getElementsAtDepth(rootElement: Element, selector: string, depth: number) {
    const result = [];

    function recursiveSearch(node: Element, currentDepth: number) {
        const targetElements = node.querySelectorAll(':scope > ' + selector);

        if (currentDepth === depth) {
            targetElements.forEach(element => result.push(element));
            return;
        }
        for (const element of targetElements) {
            const childNodes = element.children;
            for (let i = 0; i < childNodes.length; i++) {
                recursiveSearch(childNodes[i], currentDepth + 1);
            }
        }

    }


    recursiveSearch(rootElement, 0);
    return result;
}


/**
 * 递归遍历的深度控制谓词：当元素子节点足够多（≥4，通常为复杂容器）时停止下钻。
 * 注意：历史实现曾检测 NodeList 列表节点，现行为已退化为纯数量阈值，
 * 调用方（getElementsBeforeDepth 等遍历入口）依赖的是"复杂容器不再深入"这一效果。
 */
export function syHasChildListNode(root: Element): boolean {
    if (!root) {
        return false;
    }
    const children = Array.from(root.children) as HTMLElement[];

    if (children.length < 4) {
        return false;
    }

    return true;
}


export function getActiveTab(): HTMLDivElement {
    let tab = document.querySelector("div.layout__wnd--active ul.layout-tab-bar>li.item--focus");
    let dataId: string = tab?.getAttribute("data-id");
    if (!dataId) {
        return null;
    }
    const activeTab: HTMLDivElement = document.querySelector(
        `.layout-tab-container.fn__flex-1>div.protyle[data-id="${dataId}"]`
    ) as HTMLDivElement;
    return activeTab;
}


// 将 HTML 字符串转换为 DOM 对象
export function stringToDom(htmlString: string): Element {
    if (isStrBlank(htmlString)) {
        return null;
    }
    const container = document.createElement('div')
    container.innerHTML = htmlString.trim();

    return container.children[0];
}


export function hasClosestByClassName(element: HTMLElement | null, className: string): HTMLElement | false {
    // 检查传入的元素是否存在，并且是否具有指定的类名
    if (element && element.classList.contains(className)) {
        return element;
    }

    // 如果没有找到，检查父级元素
    while (element && element.parentElement && element.tagName !== "BODY") {
        element = element.parentElement;
        if (element.classList.contains(className)) {
            return element;
        }
    }

    return false;
}


export function hasClosestById(element: HTMLElement | null, id: string): HTMLElement | false {
    // 检查传入的元素是否存在，并且是否具有指定的类名
    if (element && element.id == id) {
        return element;
    }

    // 如果没有找到，检查父级元素
    while (element && element.parentElement && element.tagName !== "BODY") {
        element = element.parentElement;
        if (element.id == id) {
            return element;
        }
    }

    return false;
}
