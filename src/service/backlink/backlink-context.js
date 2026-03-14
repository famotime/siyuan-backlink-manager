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
