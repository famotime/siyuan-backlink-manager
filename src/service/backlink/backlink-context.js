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

function pushPreviewSequenceItem(sequence = [], item = null) {
  if (!item || !item.renderMarkdown) {
    return;
  }
  sequence.push(item);
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
      sourceType: "document",
      order: order++,
      text: deps.getQueryStrByBlock(backlinkBlockNode.documentBlock),
      renderMarkdown:
        backlinkBlockNode.documentBlock?.markdown ||
        backlinkBlockNode.documentBlock?.content ||
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
    visibleFragments: dedupedFragments.filter((fragment) => fragment.defaultVisible),
    previewSequence: buildBacklinkPreviewSequence(backlinkBlockNode),
    matchedFragments: [],
    includeCurDocDefBlockIds,
    includeRelatedDefBlockIds,
    matchSummaryList: [],
  };

  backlinkBlockNode.contextFragments = dedupedFragments;
  backlinkBlockNode.contextBundle = bundle;
  return bundle;
}

function buildBacklinkPreviewSequence(backlinkBlockNode = {}) {
  const selfRenderMarkdown =
    backlinkBlockNode.selfRenderMarkdown ||
    backlinkBlockNode.block?.markdown ||
    backlinkBlockNode.block?.content ||
    "";
  const nearby = [];
  const extended = [];

  pushPreviewSequenceItem(nearby, {
    sequenceRole: "sibling_prev",
    sourceType: "sibling_prev",
    renderMarkdown:
      backlinkBlockNode.previousSiblingRenderMarkdown ||
      backlinkBlockNode.previousSiblingMarkdown ||
      "",
  });
  pushPreviewSequenceItem(nearby, {
    sequenceRole: "self",
    sourceType: "self",
    renderMarkdown: selfRenderMarkdown,
  });
  pushPreviewSequenceItem(nearby, {
    sequenceRole: "sibling_next",
    sourceType: "sibling_next",
    renderMarkdown:
      backlinkBlockNode.nextSiblingRenderMarkdown ||
      backlinkBlockNode.nextSiblingMarkdown ||
      "",
  });

  pushPreviewSequenceItem(extended, {
    sequenceRole: "parent",
    sourceType: "parent",
    renderMarkdown:
      backlinkBlockNode.parentRenderMarkdown || backlinkBlockNode.parentMarkdown || "",
  });
  pushPreviewSequenceItem(extended, {
    sequenceRole: "expanded_before",
    sourceType: "expanded",
    renderMarkdown:
      backlinkBlockNode.beforeExpandedRenderMarkdown ||
      backlinkBlockNode.beforeExpandedMarkdown ||
      "",
  });
  extended.push(...nearby);
  pushPreviewSequenceItem(extended, {
    sequenceRole: "expanded_after",
    sourceType: "expanded",
    renderMarkdown:
      backlinkBlockNode.afterExpandedRenderMarkdown ||
      backlinkBlockNode.afterExpandedMarkdown ||
      "",
  });
  pushPreviewSequenceItem(extended, {
    sequenceRole: "child_headline",
    sourceType: "child_headline",
    renderMarkdown: backlinkBlockNode.headlineChildMarkdown || "",
  });
  pushPreviewSequenceItem(extended, {
    sequenceRole: "child_list",
    sourceType: "child_list",
    renderMarkdown:
      backlinkBlockNode.parentListItemTreeNode?.getFilterMarkdown?.(
        backlinkBlockNode.parentListItemTreeNode?.includeChildIdArray,
        backlinkBlockNode.parentListItemTreeNode?.excludeChildIdArray,
      ) || "",
  });

  return {
    core: [
      {
        sequenceRole: "self",
        sourceType: "self",
        renderMarkdown: selfRenderMarkdown,
      },
    ].filter((item) => item.renderMarkdown),
    nearby,
    extended,
  };
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
