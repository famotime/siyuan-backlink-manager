import {
  buildBacklinkContextBudgetHint,
  buildBacklinkVisibleSourceSummary,
} from "../../service/backlink/backlink-render-data.js";

const BACKLINK_CONTEXT_LEVEL_ORDER = ["core", "nearby", "extended", "full"];
const BACKLINK_CONTEXT_LEVEL_LABELS = {
  core: "核心",
  nearby: "近邻",
  extended: "扩展",
  full: "全文",
};

export { BACKLINK_CONTEXT_LEVEL_ORDER };

export function normalizeBacklinkContextLevel(level = "core") {
  return BACKLINK_CONTEXT_LEVEL_ORDER.includes(level) ? level : "core";
}

export function getBacklinkSummaryText(i18n = {}, documentCount = 0) {
  const template = i18n.findInBacklinkDocument || i18n.findInBacklink || "${x}";
  return template.replace("${x}", documentCount);
}

export function getBacklinkContextLevelLabel(level = "core") {
  return BACKLINK_CONTEXT_LEVEL_LABELS[level] || BACKLINK_CONTEXT_LEVEL_LABELS.core;
}

export function getNextBacklinkContextLevel(level = "core") {
  const currentIndex = BACKLINK_CONTEXT_LEVEL_ORDER.indexOf(
    normalizeBacklinkContextLevel(level),
  );
  const nextIndex = Math.min(
    currentIndex + 1,
    BACKLINK_CONTEXT_LEVEL_ORDER.length - 1,
  );
  return BACKLINK_CONTEXT_LEVEL_ORDER[nextIndex];
}

export function getPreviousBacklinkContextLevel(level = "core") {
  const currentIndex = BACKLINK_CONTEXT_LEVEL_ORDER.indexOf(
    normalizeBacklinkContextLevel(level),
  );
  const previousIndex = Math.max(currentIndex - 1, 0);
  return BACKLINK_CONTEXT_LEVEL_ORDER[previousIndex];
}

export function cycleBacklinkContextLevel(level = "core", direction = "next") {
  const currentIndex = BACKLINK_CONTEXT_LEVEL_ORDER.indexOf(
    normalizeBacklinkContextLevel(level),
  );
  const lastIndex = BACKLINK_CONTEXT_LEVEL_ORDER.length - 1;
  const nextIndex =
    direction === "previous"
      ? currentIndex <= 0
        ? lastIndex
        : currentIndex - 1
      : currentIndex >= lastIndex
      ? 0
      : currentIndex + 1;
  return BACKLINK_CONTEXT_LEVEL_ORDER[nextIndex];
}

export function buildBacklinkContextControlState({
  contextVisibilityLevel = "core",
  activeBacklink = null,
} = {}) {
  const normalizedLevel = normalizeBacklinkContextLevel(contextVisibilityLevel);
  const nextLevel = getNextBacklinkContextLevel(normalizedLevel);
  const nextLevelLabel = getBacklinkContextLevelLabel(nextLevel);

  return {
    contextVisibilityLevel: normalizedLevel,
    levelLabel: getBacklinkContextLevelLabel(normalizedLevel),
    nextLevelLabel,
    nextActionText: normalizedLevel === "full" ? "" : `下一步：${nextLevelLabel}`,
    visibleSourceSummary: buildBacklinkVisibleSourceSummary({
      contextVisibilityLevel: normalizedLevel,
      contextBundle: activeBacklink?.contextBundle || null,
    }),
    budgetHint: buildBacklinkContextBudgetHint({
      contextVisibilityLevel: normalizedLevel,
      contextBundle: activeBacklink?.contextBundle || null,
      activeBacklink,
    }),
    previousDisabled: false,
    nextDisabled: false,
  };
}
