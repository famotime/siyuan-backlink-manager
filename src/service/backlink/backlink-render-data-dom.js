function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeMarkTags(value = "") {
  return value.replace(/<\/?mark>/g, "");
}

export function extractNestedNodeDomById(dom = "", blockId = "") {
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

export function normalizeTargetBacklinkDom(dom = "", blockId = "", deps = {}) {
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

export function resolveBacklinkBlockNodeByContainer({
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

/**
 * 判断反链块的可搜索文本与锚点文本是否命中关键词。
 * @param {Object} [params] 参数对象
 * @param {Object} [params.keywordObj] 关键词集合（includeText/excludeText/includeAnchor/excludeAnchor）
 * @param {string} [params.searchableText] 可搜索正文文本
 * @param {string} [params.searchableAnchorText] 可搜索锚点文本
 * @param {Function} [params.matchKeywords] 关键词匹配函数 (content, includeText, excludeText) => boolean
 * @returns {{matchText: boolean, matchAnchor: boolean}}
 */
export function matchesBacklinkKeywords({
  keywordObj,
  searchableText = "",
  searchableAnchorText = "",
  matchKeywords,
} = {}) {
  return {
    matchText: matchKeywords(
      searchableText,
      keywordObj?.includeText || [],
      keywordObj?.excludeText || [],
    ),
    matchAnchor: matchKeywords(
      searchableAnchorText,
      keywordObj?.includeAnchor || [],
      keywordObj?.excludeAnchor || [],
    ),
  };
}

export function getBacklinkNodeSortComparator(blockSortMethod, deps = {}) {
  const { getDefBlockSortFun } = deps;

  switch (blockSortMethod) {
    case "documentAlphabeticAsc":
      return (a, b) => {
        let result = (a.documentBlock?.content || "")
          .replace("<mark>", "")
          .replace("</mark>", "")
          .localeCompare(
            (b.documentBlock?.content || "").replace("<mark>", "").replace("</mark>", ""),
            undefined,
            { sensitivity: "base", usage: "sort", numeric: true },
          );
        if (result === 0) {
          result = (a.block?.content || "")
            .replace("<mark>", "")
            .replace("</mark>", "")
            .localeCompare(
              (b.block?.content || "").replace("<mark>", "").replace("</mark>", ""),
              undefined,
              { sensitivity: "base", usage: "sort", numeric: true },
            );
        }
        if (result === 0) {
          result = Number(a.block?.created || 0) - Number(b.block?.created || 0);
        }
        return result;
      };
    case "documentAlphabeticDesc":
      return (a, b) => {
        let result = (b.documentBlock?.content || "")
          .replace("<mark>", "")
          .replace("</mark>", "")
          .localeCompare(
            (a.documentBlock?.content || "").replace("<mark>", "").replace("</mark>", ""),
            undefined,
            { sensitivity: "base", usage: "sort", numeric: true },
          );
        if (result === 0) {
          result = (b.block?.content || "")
            .replace("<mark>", "")
            .replace("</mark>", "")
            .localeCompare(
              (a.block?.content || "").replace("<mark>", "").replace("</mark>", ""),
              undefined,
              { sensitivity: "base", usage: "sort", numeric: true },
            );
        }
        if (result === 0) {
          result = Number(b.block?.created || 0) - Number(a.block?.created || 0);
        }
        return result;
      };
    case "modifiedAsc":
      return (a, b) => Number(a.block?.updated || 0) - Number(b.block?.updated || 0);
    case "modifiedDesc":
      return (a, b) => Number(b.block?.updated || 0) - Number(a.block?.updated || 0);
    case "createdAsc":
      return (a, b) => Number(a.block?.created || 0) - Number(b.block?.created || 0);
    case "createdDesc":
      return (a, b) => Number(b.block?.created || 0) - Number(a.block?.created || 0);
    case "alphabeticAsc":
      return (a, b) => {
        let result = removeMarkTags(a.block?.content || "").localeCompare(
          removeMarkTags(b.block?.content || ""),
          undefined,
          { sensitivity: "base", usage: "sort", numeric: true }
        );
        if (result === 0) {
          result = Number(b.block?.updated || 0) - Number(a.block?.updated || 0);
        }
        return result;
      };
    case "alphabeticDesc":
      return (a, b) => {
        let result = removeMarkTags(b.block?.content || "").localeCompare(
          removeMarkTags(a.block?.content || ""),
          undefined,
          { sensitivity: "base", usage: "sort", numeric: true }
        );
        if (result === 0) {
          result = Number(b.block?.updated || 0) - Number(a.block?.updated || 0);
        }
        return result;
      };
    default: {
      const blockSortFun = getDefBlockSortFun?.(blockSortMethod);
      if (blockSortFun) {
        return (a, b) => blockSortFun(a.block, b.block);
      }
      return (a, b) => Number(b.block?.updated || 0) - Number(a.block?.updated || 0);
    }
  }
}
