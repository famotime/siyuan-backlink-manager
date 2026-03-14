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

function createContextFragment({
  backlinkBlockNode,
  sourceType,
  order,
  text,
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
      deps,
    }),
  );
  pushFragment(
    fragments,
    createMarkdownFragment({
      backlinkBlockNode,
      sourceType: "document",
      order: order++,
      text: deps.getQueryStrByBlock(backlinkBlockNode.documentBlock),
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
      deps,
    }),
  );

  const includeCurDocDefBlockIds = new Set();
  const includeRelatedDefBlockIds = new Set();
  for (const fragment of fragments) {
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
    fragments,
    visibleFragments: fragments.filter((fragment) => fragment.defaultVisible),
    matchedFragments: [],
    includeCurDocDefBlockIds,
    includeRelatedDefBlockIds,
    matchSummaryList: [],
  };

  backlinkBlockNode.contextFragments = fragments;
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
  bundle.visibleFragments = (bundle.fragments || []).filter((fragment) => {
    const fragmentLevelOrder = getBacklinkContextVisibilityLevelOrder(
      fragment.visibilityLevel || "full",
    );
    return fragmentLevelOrder <= levelOrder;
  });
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

  for (const fragment of bundle.fragments || []) {
    fragment.matched = false;
    fragment.matchTypes = [];
    fragment.matchKeywords = [];
  }
}

function buildMatchSummary(fragment) {
  const label = getBacklinkContextSourceRule(fragment.sourceType).label;
  const useAnchor = fragment.matchTypes.includes("anchor") && fragment.anchorText;
  const text = useAnchor ? fragment.anchorText : fragment.displayText;
  const compactText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 48);
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
  }

  return { matchText, matchAnchor, bundle };
}
