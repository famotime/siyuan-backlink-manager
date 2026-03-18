import {
  applyBacklinkContextBudgetToNodes,
  applyBacklinkContextBudget,
} from "./backlink-context-budget.js";
import {
  getBacklinkContextSourceRule,
  getBacklinkContextVisibilityLevelOrder,
} from "./backlink-context-rules.js";

function pushFragment(fragmentArray, fragment) {
  if (!fragment || !fragment.text) {
    return;
  }
  fragmentArray.push(fragment);
}

function buildBacklinkContextFragmentDedupeKey(fragment = {}) {
  return [
    fragment.sourceType || "",
    fragment.searchText || "",
    fragment.anchorText || "",
    Array.isArray(fragment.refBlockIds) ? fragment.refBlockIds.join("|") : "",
  ].join("::");
}

export function dedupeBacklinkContextFragments(fragments = []) {
  const uniqueFragments = [];
  const fragmentKeySet = new Set();

  for (const fragment of fragments) {
    const fragmentKey = buildBacklinkContextFragmentDedupeKey(fragment);
    if (fragmentKeySet.has(fragmentKey)) {
      continue;
    }
    fragmentKeySet.add(fragmentKey);
    uniqueFragments.push(fragment);
  }

  return uniqueFragments;
}

export function getBacklinkContextExplanationFragments(bundle = null) {
  if (Array.isArray(bundle?.explanationFragments)) {
    return bundle.explanationFragments;
  }
  if (Array.isArray(bundle?.visibleFragments)) {
    return bundle.visibleFragments;
  }
  return [];
}

export function getBacklinkContextMatchMeta(bundle = null, deps = {}) {
  const getSourceRule =
    typeof deps.getBacklinkContextSourceRule === "function"
      ? deps.getBacklinkContextSourceRule
      : getBacklinkContextSourceRule;
  const primaryMatchSourceType = bundle?.primaryMatchSourceType || "";
  const headingPathText = bundle?.metaInfo?.headingPath?.text || "";
  const listPathText = bundle?.metaInfo?.listPath?.text || "";
  const locationSegments = [];
  if (headingPathText) {
    locationSegments.push(`标题：${headingPathText}`);
  }
  if (listPathText) {
    locationSegments.push(`列表：${listPathText}`);
  }
  return {
    primaryMatchSourceType,
    matchSourceLabel: primaryMatchSourceType
      ? getSourceRule(primaryMatchSourceType).label
      : "",
    matchSummaryText: bundle?.matchSummaryList?.[0] || "",
    headingPathText,
    listPathText,
    locationPathText: locationSegments.join(" | "),
  };
}

function buildMetaInfoFieldSearchText(text = "", deps = {}) {
  return (deps.removeMarkdownRefBlockStyle
    ? deps.removeMarkdownRefBlockStyle(text)
    : text
  ).toLowerCase();
}

function createMetaInfoField(key, text = "", deps = {}) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    return null;
  }

  return {
    key,
    text: normalizedText,
    renderMarkdown: normalizedText,
    searchText: buildMetaInfoFieldSearchText(normalizedText, deps),
    visibilityRole: "meta",
    searchable: false,
    matched: false,
    matchTypes: [],
    matchKeywords: [],
  };
}

function stripMetaInfoMarkdown(text = "") {
  return String(text || "")
    .replace(/\n?\{:[^}\n]+\}\s*/g, " ")
    .replace(/\(\([^)]*\)\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeadingPathSegment(markdown = "") {
  return stripMetaInfoMarkdown(
    String(markdown || "").replace(/^\s{0,3}#{1,6}\s+/, ""),
  );
}

function normalizeListPathSegment(markdown = "") {
  return stripMetaInfoMarkdown(
    String(markdown || "")
      .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, ""),
  );
}

function extractParentPathSegments(parentRenderMarkdown = "") {
  const headingPath = [];
  const listPath = [];
  const segmentArray = String(parentRenderMarkdown || "")
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segmentArray) {
    const firstLine = segment
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);
    if (!firstLine) {
      continue;
    }

    if (/^\s{0,3}#{1,6}\s+/.test(firstLine)) {
      const normalizedHeading = normalizeHeadingPathSegment(firstLine);
      if (normalizedHeading) {
        headingPath.push(normalizedHeading);
      }
      continue;
    }

    if (/^\s*([-*+]\s+|\d+\.\s+)/.test(firstLine) || /^\s*[-*+]\s+\[[ xX]\]\s+/.test(firstLine)) {
      const normalizedListItem = normalizeListPathSegment(firstLine);
      if (normalizedListItem) {
        listPath.push(normalizedListItem);
      }
    }
  }

  return {
    headingPath,
    listPath,
  };
}

function createBacklinkContextMetaInfo(backlinkBlockNode, deps) {
  const documentTitleText = deps.getQueryStrByBlock(backlinkBlockNode.documentBlock);
  const {
    headingPath,
    listPath,
  } = extractParentPathSegments(backlinkBlockNode.parentRenderMarkdown);
  const metaInfo = {
    matchedFieldKeys: [],
    matchSummaryList: [],
  };
  if (documentTitleText) {
    metaInfo.documentTitle = {
      key: "documentTitle",
      text: documentTitleText,
      renderMarkdown:
        backlinkBlockNode.documentBlock?.markdown ||
        backlinkBlockNode.documentBlock?.content ||
        "",
      searchText: buildMetaInfoFieldSearchText(documentTitleText, deps),
      visibilityRole: "meta",
      searchable: true,
      matched: false,
      matchTypes: [],
      matchKeywords: [],
    };
  }
  metaInfo.headingPath = createMetaInfoField(
    "headingPath",
    headingPath.join(" / "),
    deps,
  );
  metaInfo.listPath = createMetaInfoField(
    "listPath",
    listPath.join(" / "),
    deps,
  );
  return metaInfo;
}

function createContextFragment({
  backlinkBlockNode,
  sourceType,
  order,
  text,
  renderMarkdown,
  refBlockIds,
  anchorText,
  searchText,
}) {
  const rule = getBacklinkContextSourceRule(sourceType);
  const directDefBlockIds = backlinkBlockNode.includeDirectDefBlockIds || new Set();
  const curBlockDefIds = backlinkBlockNode.includeCurBlockDefBlockIds || new Set();
  const includeCurDocDefBlockIds = [];
  const includeRelatedDefBlockIds = [];

  for (const refBlockId of refBlockIds) {
    if (sourceType === "self" && curBlockDefIds.has(refBlockId)) {
      includeCurDocDefBlockIds.push(refBlockId);
      continue;
    }

    if (directDefBlockIds.has(refBlockId)) {
      includeCurDocDefBlockIds.push(refBlockId);
      continue;
    }

    includeRelatedDefBlockIds.push(refBlockId);
  }

  return {
    id: `${backlinkBlockNode.block.id}:${sourceType}:${order}`,
    backlinkBlockId: backlinkBlockNode.block.id,
    rootId: backlinkBlockNode.block.root_id,
    sourceType,
    visibilityLevel: rule.visibilityLevel,
    text,
    renderMarkdown,
    displayText: text,
    searchText,
    anchorText,
    refBlockIds,
    includeCurDocDefBlockIds,
    includeRelatedDefBlockIds,
    searchable: rule.searchable,
    filterable: rule.filterable,
    defaultVisible: rule.defaultVisible,
    budgetPriority: rule.budgetPriority,
    matched: false,
    matchTypes: [],
    matchKeywords: [],
    order,
  };
}

function createMarkdownFragment({
  backlinkBlockNode,
  sourceType,
  order,
  text,
  renderMarkdown,
  deps,
}) {
  if (!text) {
    return null;
  }

  return createContextFragment({
    backlinkBlockNode,
    sourceType,
    order,
    text,
    renderMarkdown,
    searchText: (deps.removeMarkdownRefBlockStyle
      ? deps.removeMarkdownRefBlockStyle(text)
      : text
    ).toLowerCase(),
    refBlockIds: deps.getRefBlockId(text),
    anchorText: deps.getMarkdownAnchorTextArray(text).join(" "),
  });
}

function getListChildFragment(backlinkBlockNode, deps, order) {
  const treeNode = backlinkBlockNode.parentListItemTreeNode;
  if (!treeNode?.getFilterMarkdown) {
    return null;
  }

  const text = treeNode.getFilterMarkdown(
    treeNode.includeChildIdArray,
    treeNode.excludeChildIdArray,
  );
  return createMarkdownFragment({
    backlinkBlockNode,
    sourceType: "child_list",
    order,
    text,
    deps,
  });
}

export function buildBacklinkContextBundle(backlinkBlockNode, deps) {
  const fragments = [];
  let order = 0;

  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "self",
      order: order++,
      text: deps.getQueryStrByBlock(backlinkBlockNode.block),
      renderMarkdown:
        backlinkBlockNode.selfRenderMarkdown ||
        backlinkBlockNode.block?.markdown ||
        backlinkBlockNode.block?.content ||
        "",
      deps,
    }),
  );
  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "parent",
      order: order++,
      text: backlinkBlockNode.parentMarkdown,
      renderMarkdown:
        backlinkBlockNode.parentRenderMarkdown || backlinkBlockNode.parentMarkdown,
      deps,
    }),
  );
  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "child_headline",
      order: order++,
      text: backlinkBlockNode.headlineChildMarkdown,
      renderMarkdown: backlinkBlockNode.headlineChildMarkdown,
      deps,
    }),
  );
  pushFragment(fragments, getListChildFragment(backlinkBlockNode, deps, order++));
  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "sibling_prev",
      order: order++,
      text: backlinkBlockNode.previousSiblingMarkdown,
      renderMarkdown:
        backlinkBlockNode.previousSiblingRenderMarkdown ||
        backlinkBlockNode.previousSiblingMarkdown,
      deps,
    }),
  );
  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "sibling_next",
      order: order++,
      text: backlinkBlockNode.nextSiblingMarkdown,
      renderMarkdown:
        backlinkBlockNode.nextSiblingRenderMarkdown ||
        backlinkBlockNode.nextSiblingMarkdown,
      deps,
    }),
  );
  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "expanded",
      order: order++,
      text: backlinkBlockNode.expandedMarkdown,
      renderMarkdown:
        backlinkBlockNode.expandedRenderMarkdown ||
        backlinkBlockNode.expandedMarkdown,
      deps,
    }),
  );

  const dedupedFragments = dedupeBacklinkContextFragments(fragments);
  const includeCurDocDefBlockIds = new Set();
  const includeRelatedDefBlockIds = new Set();
  for (const fragment of dedupedFragments) {
    for (const blockId of fragment.includeCurDocDefBlockIds) {
      includeCurDocDefBlockIds.add(blockId);
    }
    for (const blockId of fragment.includeRelatedDefBlockIds) {
      includeRelatedDefBlockIds.add(blockId);
    }
  }

  const bundle = {
    backlinkBlockId: backlinkBlockNode.block.id,
    rootId: backlinkBlockNode.block.root_id,
    fragments: dedupedFragments,
    explanationFragments: dedupedFragments.filter((fragment) => fragment.defaultVisible),
    visibleFragments: dedupedFragments.filter((fragment) => fragment.defaultVisible),
    metaInfo: createBacklinkContextMetaInfo(backlinkBlockNode, deps),
    matchedFragments: [],
    includeCurDocDefBlockIds,
    includeRelatedDefBlockIds,
    matchSummaryList: [],
  };

  backlinkBlockNode.contextFragments = dedupedFragments;
  backlinkBlockNode.contextBundle = bundle;
  return bundle;
}

export function hydrateBacklinkContextBundles(backlinkBlockNodeArray = [], deps) {
  for (const backlinkBlockNode of backlinkBlockNodeArray) {
    buildBacklinkContextBundle(backlinkBlockNode, deps);
  }
}

export function applyBacklinkContextVisibility(bundle, visibilityLevel = "core") {
  const levelOrder = getBacklinkContextVisibilityLevelOrder(visibilityLevel);
  const explanationFragments = (bundle.fragments || []).filter((fragment) => {
    const fragmentLevelOrder = getBacklinkContextVisibilityLevelOrder(
      fragment.visibilityLevel || "full",
    );
    return fragmentLevelOrder <= levelOrder;
  });
  bundle.explanationFragments = explanationFragments;
  bundle.visibleFragments = explanationFragments;
  return bundle;
}

export function applyBacklinkContextVisibilityToNodes(
  backlinkBlockNodeArray = [],
  visibilityLevel = "core",
) {
  for (const backlinkBlockNode of backlinkBlockNodeArray) {
    if (!backlinkBlockNode.contextBundle) {
      continue;
    }
    applyBacklinkContextVisibility(backlinkBlockNode.contextBundle, visibilityLevel);
  }
}

export { applyBacklinkContextBudget, applyBacklinkContextBudgetToNodes };

function resetBundleMatches(bundle) {
  bundle.matchedFragments = [];
  bundle.matchSummaryList = [];
  bundle.primaryMatchSourceType = undefined;
  if (!bundle.metaInfo) {
    bundle.metaInfo = {
      matchedFieldKeys: [],
      matchSummaryList: [],
    };
  }
  bundle.metaInfo.matchedFieldKeys = [];
  bundle.metaInfo.matchSummaryList = [];
  bundle.metaInfo.primaryMatchKey = undefined;
  if (bundle.metaInfo.documentTitle) {
    bundle.metaInfo.documentTitle.matched = false;
    bundle.metaInfo.documentTitle.matchTypes = [];
    bundle.metaInfo.documentTitle.matchKeywords = [];
  }
  if (bundle.metaInfo.headingPath) {
    bundle.metaInfo.headingPath.matched = false;
    bundle.metaInfo.headingPath.matchTypes = [];
    bundle.metaInfo.headingPath.matchKeywords = [];
  }
  if (bundle.metaInfo.listPath) {
    bundle.metaInfo.listPath.matched = false;
    bundle.metaInfo.listPath.matchTypes = [];
    bundle.metaInfo.listPath.matchKeywords = [];
  }

  for (const fragment of bundle.fragments || []) {
    fragment.matched = false;
    fragment.matchTypes = [];
    fragment.matchKeywords = [];
  }
}

function normalizeMatchSummaryText(text = "") {
  return String(text || "")
    .replace(/\n?\{:[^}\n]+\}\s*/g, " ")
    .replace(/\(\(\d{14}-\w{7}\s['"]([^'"]+)['"]\)\)/g, "$1")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMatchSummary(fragment) {
  const label = getBacklinkContextSourceRule(fragment.sourceType).label;
  const useAnchor = fragment.matchTypes.includes("anchor") && fragment.anchorText;
  const text = useAnchor ? fragment.anchorText : fragment.displayText;
  const compactText = normalizeMatchSummaryText(text).slice(0, 48);
  return compactText ? `${label}：${compactText}` : label;
}

function buildMetaInfoMatchSummary(label, text = "") {
  const compactText = normalizeMatchSummaryText(text).slice(0, 48);
  return compactText ? `${label}：${compactText}` : label;
}

export function matchBacklinkContextBundle(bundle, { keywordObj, matchKeywords }) {
  resetBundleMatches(bundle);

  const includeText = keywordObj.includeText || [];
  const excludeText = keywordObj.excludeText || [];
  const includeAnchor = keywordObj.includeAnchor || [];
  const excludeAnchor = keywordObj.excludeAnchor || [];
  const requireText = includeText.length > 0;
  const requireAnchor = includeAnchor.length > 0;

  let matchText = !requireText;
  let matchAnchor = !requireAnchor;

  for (const fragment of bundle.fragments || []) {
    if (!fragment.searchable) {
      continue;
    }

    const fragmentTextMatched = matchKeywords(
      fragment.searchText || "",
      includeText,
      excludeText,
    );
    const fragmentAnchorMatched = matchKeywords(
      (fragment.anchorText || "").toLowerCase(),
      includeAnchor,
      excludeAnchor,
    );

    if (requireText && fragmentTextMatched) {
      matchText = true;
      fragment.matchTypes.push("text");
      fragment.matchKeywords.push(...includeText);
    }
    if (requireAnchor && fragmentAnchorMatched) {
      matchAnchor = true;
      fragment.matchTypes.push("anchor");
      fragment.matchKeywords.push(...includeAnchor);
    }

    if (
      (!requireText && !requireAnchor) ||
      (requireText && fragmentTextMatched) ||
      (requireAnchor && fragmentAnchorMatched)
    ) {
      if (fragment.matchTypes.length > 0) {
        fragment.matched = true;
        bundle.matchedFragments.push(fragment);
      }
    }
  }

  const documentTitleMeta = bundle.metaInfo?.documentTitle;
  if (documentTitleMeta?.searchable) {
    const documentTitleMatched = matchKeywords(
      documentTitleMeta.searchText || "",
      includeText,
      excludeText,
    );
    if (requireText && documentTitleMatched) {
      matchText = true;
      documentTitleMeta.matchTypes.push("text");
      documentTitleMeta.matchKeywords.push(...includeText);
    }
    if (documentTitleMeta.matchTypes.length > 0) {
      documentTitleMeta.matched = true;
      bundle.metaInfo.matchedFieldKeys.push(documentTitleMeta.key);
      bundle.metaInfo.primaryMatchKey = bundle.metaInfo.primaryMatchKey || documentTitleMeta.key;
      bundle.metaInfo.matchSummaryList.push(
        buildMetaInfoMatchSummary("文档", documentTitleMeta.text),
      );
    }
  }

  if (bundle.matchedFragments.length > 0) {
    bundle.matchedFragments.sort((a, b) => {
      const priorityA = getBacklinkContextSourceRule(a.sourceType).matchPriority;
      const priorityB = getBacklinkContextSourceRule(b.sourceType).matchPriority;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return (a.order || 0) - (b.order || 0);
    });
    bundle.primaryMatchSourceType = bundle.matchedFragments[0].sourceType;
    bundle.matchSummaryList = bundle.matchedFragments
      .slice(0, 3)
      .map(buildMatchSummary);
    if (bundle.matchSummaryList.length < 3 && bundle.metaInfo.matchSummaryList.length > 0) {
      bundle.matchSummaryList.push(
        ...bundle.metaInfo.matchSummaryList.slice(0, 3 - bundle.matchSummaryList.length),
      );
    }
  } else if (bundle.metaInfo.matchSummaryList.length > 0) {
    bundle.matchSummaryList = bundle.metaInfo.matchSummaryList.slice(0, 3);
  }

  return { matchText, matchAnchor, bundle };
}
