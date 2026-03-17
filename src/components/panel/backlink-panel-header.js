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

export function buildBacklinkPaginationState({
  pageNum = 0,
  totalPage = 0,
} = {}) {
  const isVisible = totalPage > 0;

  return {
    isVisible,
    progressText: isVisible ? `${pageNum}/${totalPage}` : "",
    previousDisabled: !isVisible || pageNum <= 1,
    nextDisabled: !isVisible || pageNum >= totalPage,
  };
}

export function getBacklinkSummaryText(i18n = {}, documentCount = 0) {
  const template = i18n.findInBacklinkDocument || i18n.findInBacklink || "${x}";
  return template.replace("${x}", documentCount);
}

export function getBacklinkContextLevelLabel(level = "core") {
  return BACKLINK_CONTEXT_LEVEL_LABELS[level] || BACKLINK_CONTEXT_LEVEL_LABELS.core;
}

export function getNextBacklinkContextLevel(level = "core") {
  const currentIndex = BACKLINK_CONTEXT_LEVEL_ORDER.includes(level)
    ? BACKLINK_CONTEXT_LEVEL_ORDER.indexOf(level)
    : 0;
  const nextIndex = Math.min(
    currentIndex + 1,
    BACKLINK_CONTEXT_LEVEL_ORDER.length - 1,
  );
  return BACKLINK_CONTEXT_LEVEL_ORDER[nextIndex];
}

export function buildBacklinkContextControlState({
  contextVisibilityLevel = "core",
  activeBacklink = null,
} = {}) {
  const normalizedLevel = BACKLINK_CONTEXT_LEVEL_ORDER.includes(contextVisibilityLevel)
    ? contextVisibilityLevel
    : "core";
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
    previousDisabled: normalizedLevel === BACKLINK_CONTEXT_LEVEL_ORDER[0],
    nextDisabled:
      normalizedLevel ===
      BACKLINK_CONTEXT_LEVEL_ORDER[BACKLINK_CONTEXT_LEVEL_ORDER.length - 1],
  };
}
