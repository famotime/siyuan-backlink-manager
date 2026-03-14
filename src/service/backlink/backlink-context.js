const SOURCE_RULES = {
  self: {
    visibilityLevel: "core",
    defaultVisible: true,
    searchable: true,
    filterable: true,
  },
  document: {
    visibilityLevel: "core",
    defaultVisible: true,
    searchable: true,
    filterable: false,
  },
  parent: {
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
  },
  child_headline: {
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
  },
  child_list: {
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
  },
  sibling_prev: {
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
  },
  sibling_next: {
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
  },
};

const VISIBILITY_LEVEL_ORDER = {
  core: 1,
  nearby: 2,
  extended: 3,
  full: 4,
};

const MATCH_SOURCE_PRIORITY = {
  self: 1,
  sibling_prev: 2,
  sibling_next: 2,
  parent: 3,
  child_list: 4,
  child_headline: 4,
  document: 5,
};

const SOURCE_LABELS = {
  self: "反链块",
  document: "文档",
  parent: "父级",
  child_headline: "标题子级",
  child_list: "列表子级",
  sibling_prev: "前相邻块",
  sibling_next: "后相邻块",
};

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
  const rule = SOURCE_RULES[sourceType];
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
  const levelOrder = VISIBILITY_LEVEL_ORDER[visibilityLevel] || VISIBILITY_LEVEL_ORDER.core;
  bundle.visibleFragments = (bundle.fragments || []).filter((fragment) => {
    const fragmentLevelOrder =
      VISIBILITY_LEVEL_ORDER[fragment.visibilityLevel] || VISIBILITY_LEVEL_ORDER.full;
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
  const label = SOURCE_LABELS[fragment.sourceType] || fragment.sourceType;
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
      const priorityA = MATCH_SOURCE_PRIORITY[a.sourceType] || Infinity;
      const priorityB = MATCH_SOURCE_PRIORITY[b.sourceType] || Infinity;
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
