import { buildBacklinkContextBundle, matchBacklinkContextBundle } from "./backlink-context.js";
import { getBacklinkContextSourceRule } from "./backlink-context-rules.js";

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

  const visibleFragments = Array.isArray(contextBundle?.explanationFragments)
    ? contextBundle.explanationFragments
    : Array.isArray(contextBundle?.visibleFragments)
      ? contextBundle.visibleFragments
    : [];
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
} = {}) {
  if (contextVisibilityLevel === "full") {
    return "";
  }

  const budgetSummary = contextBundle?.budgetSummary;
  if (!budgetSummary?.truncated) {
    return "";
  }

  return "部分上下文已裁剪，继续展开查看更多";
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNestedNodeDomById(dom = "", blockId = "") {
  if (!dom || !blockId) {
    return "";
  }

  const openTagRegExp = new RegExp(
    `<div\\b[^>]*\\bdata-node-id=(["'])${escapeRegExp(blockId)}\\1[^>]*>`,
    "i",
  );
  const openTagMatch = openTagRegExp.exec(dom);
  if (!openTagMatch) {
    return "";
  }

  const startIndex = openTagMatch.index;
  const tokenRegExp = /<div\b[^>]*>|<\/div>/gi;
  tokenRegExp.lastIndex = startIndex + openTagMatch[0].length;

  let depth = 1;
  let tokenMatch;
  while ((tokenMatch = tokenRegExp.exec(dom))) {
    if (/^<\/div/i.test(tokenMatch[0])) {
      depth -= 1;
      if (depth === 0) {
        return dom.slice(startIndex, tokenRegExp.lastIndex);
      }
      continue;
    }
    depth += 1;
  }

  return "";
}

function normalizeTargetBacklinkDom(dom = "", blockId = "", deps = {}) {
  const { extractTargetBacklinkDom, getBacklinkBlockId } = deps;
  if (!dom || !blockId) {
    return "";
  }

  const extractedDom =
    typeof extractTargetBacklinkDom === "function"
      ? extractTargetBacklinkDom(dom, blockId)
      : "";
  if (
    extractedDom &&
    (
      typeof getBacklinkBlockId !== "function" ||
      getBacklinkBlockId(extractedDom) === blockId
    )
  ) {
    return extractedDom;
  }

  return extractNestedNodeDomById(dom, blockId);
}

function resolveBacklinkBlockNodeByContainer({
  backlink,
  backlinkBlockNodeMap,
  backlinkBlockParentNodeMap,
  getBacklinkBlockId,
  extractTargetBacklinkDom,
}) {
  const rawBacklinkBlockId = getBacklinkBlockId(backlink.dom);
  const directNode = backlinkBlockNodeMap.get(rawBacklinkBlockId);
  if (directNode) {
    return {
      backlinkBlockId: rawBacklinkBlockId,
      backlinkBlockNode: directNode,
      normalizedDom: backlink.dom,
    };
  }

  const parentCandidates = backlinkBlockParentNodeMap.get(rawBacklinkBlockId) || [];
  for (const candidate of parentCandidates) {
    const normalizedDom = normalizeTargetBacklinkDom(
      backlink.dom,
      candidate.block.id,
      {
        extractTargetBacklinkDom,
        getBacklinkBlockId,
      },
    );
    if (normalizedDom) {
      return {
        backlinkBlockId: candidate.block.id,
        backlinkBlockNode: candidate,
        normalizedDom,
      };
    }
  }

  return {
    backlinkBlockId: rawBacklinkBlockId,
    backlinkBlockNode: null,
    normalizedDom: backlink.dom,
  };
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
    const defId = intersectionSet(
      node.includeCurBlockDefBlockIds,
      node.includeDirectDefBlockIds,
    )[0];
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

    backlink.dom = (normalizedDom || backlink.dom).replace(/search-mark/g, "");
    backlink.backlinkBlock = backlinkBlockNode.block;
    backlink.contextBundle = backlinkBlockNode.contextBundle;
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

  const includeRelatedDefBlockIds = queryParams.includeRelatedDefBlockIds;
  const excludeRelatedDefBlockIds = queryParams.excludeRelatedDefBlockIds;
  const includeDocumentIds = queryParams.includeDocumentIds;
  const excludeDocumentIds = queryParams.excludeDocumentIds;
  const backlinkCurDocDefBlockType = queryParams.backlinkCurDocDefBlockType;

  const backlinkBlockInfo = backlinkBlockNode.block;
  const backlinkDirectDefBlockIds = backlinkBlockNode.includeDirectDefBlockIds;
  const backlinkRelatedDefBlockIds = backlinkBlockNode.includeRelatedDefBlockIds;
  const backlinkParentDefBlockIds = backlinkBlockNode.includeParentDefBlockIds;
  const parentListItemTreeNode = backlinkBlockNode.parentListItemTreeNode;
  const dynamicAnchorMap = backlinkBlockNode.dynamicAnchorMap;
  const staticAnchorMap = backlinkBlockNode.staticAnchorMap;

  if (isSetNotEmpty(includeDocumentIds) && !includeDocumentIds.has(backlinkBlockInfo.root_id)) {
    return false;
  }
  if (isSetNotEmpty(excludeDocumentIds) && excludeDocumentIds.has(backlinkBlockInfo.root_id)) {
    return false;
  }

  if (isSetNotEmpty(excludeRelatedDefBlockIds)) {
    if (parentListItemTreeNode) {
      const excludeItemIdArray = parentListItemTreeNode.resetExcludeItemIdArray(
        [...backlinkParentDefBlockIds],
        Array.from(excludeRelatedDefBlockIds),
      );
      if (excludeItemIdArray.includes(parentListItemTreeNode.id)) {
        return false;
      }
    } else {
      for (const defBlockId of excludeRelatedDefBlockIds) {
        if (backlinkRelatedDefBlockIds.has(defBlockId)) {
          return false;
        }
      }
    }
  }

  if (isSetNotEmpty(includeRelatedDefBlockIds)) {
    if (parentListItemTreeNode) {
      const includeItemIdArray = parentListItemTreeNode.resetIncludeItemIdArray(
        [...backlinkParentDefBlockIds],
        Array.from(includeRelatedDefBlockIds),
      );
      if (!includeItemIdArray.includes(parentListItemTreeNode.id)) {
        return false;
      }
    } else {
      for (const defBlockId of includeRelatedDefBlockIds) {
        if (!backlinkRelatedDefBlockIds.has(defBlockId)) {
          return false;
        }
      }
    }
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
      const matchText = matchKeywords(
        backlinkConcatContent,
        keywordObj.includeText,
        keywordObj.excludeText,
      );
      const matchAnchor = matchKeywords(
        backlinkAllAnchorText,
        keywordObj.includeAnchor,
        keywordObj.excludeAnchor,
      );
      if (!matchText || !matchAnchor) {
        return false;
      }
    }
  }

  if (backlinkCurDocDefBlockType === "dynamicAnchorText") {
    if (dynamicAnchorMap.size <= 0) {
      return false;
    }
    for (const blockId of dynamicAnchorMap.keys()) {
      if (backlinkDirectDefBlockIds.has(blockId)) {
        return true;
      }
    }
    return false;
  }

  if (backlinkCurDocDefBlockType === "staticAnchorText") {
    if (staticAnchorMap.size <= 0) {
      return false;
    }
    for (const blockId of staticAnchorMap.keys()) {
      if (backlinkDirectDefBlockIds.has(blockId)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

export function backlinkBlockNodeArraySort(backlinkBlockArray, blockSortMethod, deps) {
  const { getDefBlockSortFun } = deps;
  if (!backlinkBlockArray || backlinkBlockArray.length <= 0) {
    return;
  }

  let backlinkBlockNodeSortFun;
  switch (blockSortMethod) {
    case "documentAlphabeticAsc":
      backlinkBlockNodeSortFun = (a, b) => {
        let result = a.documentBlock.content
          .replace("<mark>", "")
          .replace("</mark>", "")
          .localeCompare(
            b.documentBlock.content.replace("<mark>", "").replace("</mark>", ""),
            undefined,
            { sensitivity: "base", usage: "sort", numeric: true },
          );
        if (result === 0) {
          result = a.block.content
            .replace("<mark>", "")
            .replace("</mark>", "")
            .localeCompare(
              b.block.content.replace("<mark>", "").replace("</mark>", ""),
              undefined,
              { sensitivity: "base", usage: "sort", numeric: true },
            );
        }
        if (result === 0) {
          result = Number(a.block.created) - Number(b.block.created);
        }
        return result;
      };
      break;
    case "documentAlphabeticDesc":
      backlinkBlockNodeSortFun = (a, b) => {
        let result = b.documentBlock.content
          .replace("<mark>", "")
          .replace("</mark>", "")
          .localeCompare(
            a.documentBlock.content.replace("<mark>", "").replace("</mark>", ""),
            undefined,
            { sensitivity: "base", usage: "sort", numeric: true },
          );
        if (result === 0) {
          result = b.block.content
            .replace("<mark>", "")
            .replace("</mark>", "")
            .localeCompare(
              a.block.content.replace("<mark>", "").replace("</mark>", ""),
              undefined,
              { sensitivity: "base", usage: "sort", numeric: true },
            );
        }
        if (result === 0) {
          result = Number(b.block.created) - Number(a.block.created);
        }
        return result;
      };
      break;
    default: {
      const blockSortFun = getDefBlockSortFun(blockSortMethod);
      if (blockSortFun) {
        backlinkBlockNodeSortFun = (a, b) => blockSortFun(a.block, b.block);
      }
    }
  }

  if (backlinkBlockNodeSortFun) {
    backlinkBlockArray.sort(backlinkBlockNodeSortFun);
  }
}
