export const BACKLINK_CONTEXT_SOURCE_RULES = {
  self: {
    label: "反链块",
    visibilityLevel: "core",
    defaultVisible: true,
    searchable: true,
    filterable: true,
    budgetPriority: 1,
    matchPriority: 1,
  },
  document: {
    label: "文档",
    visibilityLevel: "core",
    defaultVisible: true,
    searchable: true,
    filterable: false,
    budgetPriority: 2,
    matchPriority: 5,
  },
  parent: {
    label: "父级",
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
    budgetPriority: 3,
    matchPriority: 3,
  },
  child_headline: {
    label: "标题子级",
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
    budgetPriority: 4,
    matchPriority: 4,
  },
  child_list: {
    label: "列表子级",
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
    budgetPriority: 4,
    matchPriority: 4,
  },
  sibling_prev: {
    label: "前相邻块",
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
    budgetPriority: 3,
    matchPriority: 2,
  },
  sibling_next: {
    label: "后相邻块",
    visibilityLevel: "nearby",
    defaultVisible: false,
    searchable: true,
    filterable: true,
    budgetPriority: 3,
    matchPriority: 2,
  },
  expanded: {
    label: "扩展结构",
    visibilityLevel: "extended",
    defaultVisible: false,
    searchable: false,
    filterable: false,
    budgetPriority: 6,
    matchPriority: 99,
  },
};

const BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER = {
  core: 1,
  nearby: 2,
  extended: 3,
  full: 4,
};

const DEFAULT_BACKLINK_CONTEXT_SOURCE_RULE = {
  label: "上下文",
  visibilityLevel: "extended",
  defaultVisible: false,
  searchable: false,
  filterable: false,
  budgetPriority: 99,
  matchPriority: 99,
};

export function getBacklinkContextSourceRule(sourceType) {
  return (
    BACKLINK_CONTEXT_SOURCE_RULES[sourceType] ||
    DEFAULT_BACKLINK_CONTEXT_SOURCE_RULE
  );
}

export function getBacklinkContextVisibilityLevelOrder(level = "core") {
  return (
    BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER[level] ||
    BACKLINK_CONTEXT_VISIBILITY_LEVEL_ORDER.core
  );
}
