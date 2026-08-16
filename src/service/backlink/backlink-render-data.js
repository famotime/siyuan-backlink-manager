import {
  buildBacklinkContextBundle,
  getBacklinkContextExplanationFragments,
  matchBacklinkContextBundle,
} from "./backlink-context.js";
import {
  extractNestedNodeDomById,
  getBacklinkNodeSortComparator,
  matchesBacklinkKeywords,
  normalizeTargetBacklinkDom,
  resolveBacklinkBlockNodeByContainer,
} from "./backlink-render-data-dom.js";
import { getBacklinkContextSourceRule } from "./backlink-context-rules.js";
import { sanitizeBacklinkContent } from "./backlink-content-sanitize.js";
import { getBacklinkSourceWindowByLevel } from "./backlink-source-window.js";

export function formatBacklinkDocApiKeyword(keyword = "") {
  if (!keyword) {
    return "";
  }

  const keywordSplitArray = keyword.split("'");
  let longestSubstring = "";
  for (const substring of keywordSplitArray) {
    if (substring.length > longestSubstring.length) {
      longestSubstring = substring;
    }
  }

  return longestSubstring.substring(0, 80);
}

export function buildLegacyBacklinkSearchText({
  selfMarkdown = "",
  documentMarkdown = "",
  parentMarkdown = "",
  headlineChildMarkdown = "",
  previousSiblingMarkdown = "",
  nextSiblingMarkdown = "",
  listItemChildMarkdown = "",
} = {}) {
  return [
    selfMarkdown,
    documentMarkdown,
    parentMarkdown,
    headlineChildMarkdown,
    previousSiblingMarkdown,
    nextSiblingMarkdown,
    listItemChildMarkdown,
  ].join("");
}

export function buildBacklinkVisibleSourceSummary({
  contextVisibilityLevel = "core",
  contextBundle = null,
} = {}) {
  if (contextVisibilityLevel === "full") {
    return "已进入全文模式";
  }

  const visibleFragments = getBacklinkContextExplanationFragments(contextBundle);
  const levelLabels = [];
  const seenSourceTypes = new Set();

  for (const fragment of visibleFragments) {
    if (!fragment || fragment.visibilityLevel !== contextVisibilityLevel) {
      continue;
    }
    if (seenSourceTypes.has(fragment.sourceType)) {
      continue;
    }
    seenSourceTypes.add(fragment.sourceType);
    levelLabels.push(getBacklinkContextSourceRule(fragment.sourceType).label);
  }

  if (levelLabels.length <= 0) {
    return "";
  }
  if (levelLabels.length <= 3) {
    return `已显示：${levelLabels.join("、")}`;
  }
  return `已显示：${levelLabels.slice(0, 2).join("、")}等${levelLabels.length}类上下文`;
}

export function buildBacklinkContextBudgetHint({
  contextVisibilityLevel = "core",
  contextBundle = null,
  activeBacklink = null,
} = {}) {
  if (contextVisibilityLevel === "full") {
    return "";
  }

  const hasSourceWindow = Boolean(
    getBacklinkSourceWindowByLevel(activeBacklink, contextVisibilityLevel),
  );
  if (activeBacklink?.backlinkBlock?.id && !hasSourceWindow) {
    return "原文上下文不可用，当前显示为降级结果";
  }

  const budgetSummary = contextBundle?.budgetSummary;
  if (!budgetSummary?.truncated) {
    return "";
  }

  return "部分上下文已裁剪，继续展开查看更多";
}

export function getBacklinkBlockId(dom, deps) {
  const { isStrBlank, stringToDom, NewNodeID } = deps;
  if (isStrBlank(dom)) {
    return NewNodeID();
  }
  const backlinkDom = stringToDom(dom);
  if (!backlinkDom) {
    return NewNodeID();
  }
  const id = backlinkDom.getAttribute("data-node-id");
  if (isStrBlank(id)) {
    return NewNodeID();
  }
  return id;
}

export async function getBacklinkDocByApiOrCache(
  rootId,
  defId,
  refTreeId,
  keyword,
  containChildren,
  deps,
) {
  const {
    CacheManager,
    SettingService,
    getBacklinkDoc,
  } = deps;

  keyword = formatBacklinkDocApiKeyword(keyword);
  keyword = "";

  let backlinks = CacheManager.ins.getBacklinkDocApiData(
    rootId,
    defId,
    refTreeId,
    keyword,
  );
  const result = { backlinks, usedCache: false };
  if (backlinks) {
    result.usedCache = true;
    return result;
  }

  const startTime = performance.now();
  const data = await getBacklinkDoc(defId, refTreeId, keyword, containChildren);
  backlinks = data.backlinks;
  const executionTime = performance.now() - startTime;

  const cacheAfterResponseMs = SettingService.ins.SettingConfig.cacheAfterResponseMs;
  const cacheExpirationTime = SettingService.ins.SettingConfig.cacheExpirationTime;

  if (
    cacheAfterResponseMs >= 0 &&
    cacheExpirationTime >= 0 &&
    executionTime > cacheAfterResponseMs
  ) {
    CacheManager.ins.setBacklinkDocApiData(
      defId,
      refTreeId,
      keyword,
      data.backlinks,
      cacheExpirationTime,
    );
  }

  result.backlinks = backlinks;
  return result;
}

export async function getBatchBacklinkDoc({
  curRootId,
  backlinkBlockNodeArray = [],
  deps,
}) {
  const {
    intersectionSet,
    longestCommonSubstring,
    getBacklinkDocByApiOrCache,
    getBacklinkBlockId,
    extractTargetBacklinkDom,
    triggerIncompleteBacklinkFetch,
  } = deps;

  const defIdRefTreeIdKeywordMap = new Map();
  const backlinkBlockNodeMap = new Map();
  const backlinkBlockParentNodeMap = new Map();

  for (const [index, node] of backlinkBlockNodeArray.entries()) {
    const backlinkRootId = node.block.root_id;
    const backlinkContent = node.block.content;
    const defId =
      intersectionSet(
        node.includeCurBlockDefBlockIds,
        node.includeDirectDefBlockIds,
      )[0] || curRootId;
    const mapKey = `${defId}<->${backlinkRootId}`;
    let keyword = defIdRefTreeIdKeywordMap.get(mapKey);
    if (keyword === undefined) {
      keyword = backlinkContent;
    } else {
      keyword = longestCommonSubstring(keyword, backlinkContent);
    }
    defIdRefTreeIdKeywordMap.set(mapKey, keyword);

    backlinkBlockNodeMap.set(node.block.id, node);
    let parentNodeArray = backlinkBlockParentNodeMap.get(node.block.parent_id);
    if (!parentNodeArray) {
      parentNodeArray = [];
      backlinkBlockParentNodeMap.set(node.block.parent_id, parentNodeArray);
    }
    parentNodeArray.push(node);
  }

  let usedCache = false;
  const allBacklinksArray = (
    await Promise.all(
      Array.from(defIdRefTreeIdKeywordMap.keys()).map(async (key) => {
        const [defId, refTreeId] = key.split("<->");
        const keyword = defIdRefTreeIdKeywordMap.get(key);
        const data = await getBacklinkDocByApiOrCache(
          curRootId,
          defId,
          refTreeId,
          keyword,
          false,
        );
        if (data.usedCache) {
          usedCache = true;
        }
        return data.backlinks;
      }),
    )
  ).flat();

  const backlinkDataMap = new Map();
  for (const backlink of allBacklinksArray) {
    const { backlinkBlockId, backlinkBlockNode, normalizedDom } =
      resolveBacklinkBlockNodeByContainer({
        backlink,
        backlinkBlockNodeMap,
        backlinkBlockParentNodeMap,
        getBacklinkBlockId,
        extractTargetBacklinkDom,
      });
    if (backlinkDataMap.has(backlinkBlockId)) {
      continue;
    }
    if (!backlinkBlockNode) {
      continue;
    }

    // 统一清洗渲染内容：剥离 HTML 注释、格式化 ISO 时间戳、压缩连续空行
    backlink.dom = sanitizeBacklinkContent(
      (normalizedDom || backlink.dom).replace(/search-mark/g, ""),
    );
    backlink.backlinkBlock = backlinkBlockNode.block;
    backlink.contextBundle = backlinkBlockNode.contextBundle;
    backlink.targetBlocks = backlinkBlockNode.targetBlocks || [];
    backlinkDataMap.set(backlinkBlockId, backlink);
    if (backlinkBlockNode.parentListItemTreeNode) {
      backlink.includeChildListItemIdArray =
        backlinkBlockNode.parentListItemTreeNode.includeChildIdArray;
      backlink.excludeChildLisetItemIdArray =
        backlinkBlockNode.parentListItemTreeNode.excludeChildIdArray;
    }
  }

  const backlinks = Array.from(backlinkDataMap.values());

  if (backlinkBlockNodeArray.length > backlinks.length) {
    triggerIncompleteBacklinkFetch(curRootId, backlinkBlockNodeArray, backlinks);
  }

  return { backlinks, usedCache };
}

export function isBacklinkBlockValid(queryParams, backlinkBlockNode, deps) {
  const {
    isSetNotEmpty,
    parseSearchSyntax,
    getQueryStrByBlock,
    getMarkdownAnchorTextArray,
    removeMarkdownRefBlockStyle,
    matchKeywords,
  } = deps;
  const keywordStr = queryParams.backlinkKeywordStr;

  const includeDocumentIds = queryParams.includeDocumentIds;
  const excludeDocumentIds = queryParams.excludeDocumentIds;

  const backlinkBlockInfo = backlinkBlockNode.block;
  const parentListItemTreeNode = backlinkBlockNode.parentListItemTreeNode;

  if (isSetNotEmpty(includeDocumentIds) && !includeDocumentIds.has(backlinkBlockInfo.root_id)) {
    return false;
  }
  if (isSetNotEmpty(excludeDocumentIds) && excludeDocumentIds.has(backlinkBlockInfo.root_id)) {
    return false;
  }

  if (keywordStr) {
    const keywordObj = parseSearchSyntax(keywordStr.toLowerCase());
    let contextBundle = backlinkBlockNode.contextBundle;
    if (!contextBundle?.fragments?.length || parentListItemTreeNode) {
      contextBundle = buildBacklinkContextBundle(backlinkBlockNode, {
        getQueryStrByBlock,
        getMarkdownAnchorTextArray,
        removeMarkdownRefBlockStyle,
        getRefBlockId: () => [],
      });
    }

    let backlinkConcatContent = "";
    let backlinkAllAnchorText = "";
    if (contextBundle?.fragments?.length) {
      const matchResult = matchBacklinkContextBundle(contextBundle, {
        keywordObj,
        matchKeywords,
      });
      if (!matchResult.matchText || !matchResult.matchAnchor) {
        return false;
      }
      backlinkConcatContent = contextBundle.fragments
        .filter((fragment) => fragment.searchable)
        .map((fragment) => fragment.searchText)
        .join(" ");
      backlinkAllAnchorText = contextBundle.fragments
        .filter((fragment) => fragment.searchable)
        .map((fragment) => fragment.anchorText || "")
        .join(" ");
    } else {
      const selfMarkdown = getQueryStrByBlock(backlinkBlockNode.block);
      const documentMarkdown = getQueryStrByBlock(backlinkBlockNode.documentBlock);
      const parentMarkdown = backlinkBlockNode.parentMarkdown;
      const headlineChildMarkdown = backlinkBlockNode.headlineChildMarkdown;
      const previousSiblingMarkdown = backlinkBlockNode.previousSiblingMarkdown || "";
      const nextSiblingMarkdown = backlinkBlockNode.nextSiblingMarkdown || "";
      let listItemChildMarkdown = "";
      if (parentListItemTreeNode) {
        listItemChildMarkdown = parentListItemTreeNode.getFilterMarkdown(
          parentListItemTreeNode.includeChildIdArray,
          parentListItemTreeNode.excludeChildIdArray,
        );
      }

      backlinkConcatContent = buildLegacyBacklinkSearchText({
        selfMarkdown,
        documentMarkdown,
        parentMarkdown,
        headlineChildMarkdown,
        previousSiblingMarkdown,
        nextSiblingMarkdown,
        listItemChildMarkdown,
      });
      backlinkAllAnchorText = getMarkdownAnchorTextArray(backlinkConcatContent).join(" ");
      backlinkConcatContent = removeMarkdownRefBlockStyle(backlinkConcatContent).toLowerCase();
    }
    if (!contextBundle?.fragments?.length) {
      const { matchText, matchAnchor } = matchesBacklinkKeywords({
        keywordObj,
        searchableText: backlinkConcatContent,
        searchableAnchorText: backlinkAllAnchorText,
        matchKeywords,
      });
      if (!matchText || !matchAnchor) {
        return false;
      }
    }
  }

  return true;
}

export function backlinkBlockNodeArraySort(backlinkBlockArray, blockSortMethod, deps) {
  if (!backlinkBlockArray || backlinkBlockArray.length <= 0) {
    return;
  }

  const backlinkBlockNodeSortFun = getBacklinkNodeSortComparator(
    blockSortMethod,
    deps,
  );

  if (backlinkBlockNodeSortFun) {
    backlinkBlockArray.sort(backlinkBlockNodeSortFun);
  }
}
