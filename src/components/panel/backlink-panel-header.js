import {
  buildBacklinkContextBudgetHint,
  buildBacklinkVisibleSourceSummary,
} from "../../service/backlink/backlink-render-data.js";

import {
  BACKLINK_CONTEXT_VISIBILITY_LEVELS as BACKLINK_CONTEXT_LEVEL_ORDER,
} from "../../service/backlink/backlink-context-rules.js";
// 兼容中文回退：i18n 由调用方传入（EnvConfig.ins.i18n），缺失时使用中文文案
const BACKLINK_CONTEXT_LEVEL_LABELS = {
  core: "核心",
  nearby: "近邻",
  extended: "扩展",
  full: "全文",
};
const BACKLINK_CONTEXT_LEVEL_TOOLTIPS = {
  core: "核心层：仅展示直接引用的反链块",
  nearby: "近邻层：展示前后相邻段落及父级结构",
  extended: "扩展层：展示所在章节的完整上下文",
  full: "全文层：展示来源文档的全部正文",
};
const BACKLINK_CONTEXT_LEVEL_LABEL_I18N_KEYS = {
  core: "contextLevelCore",
  nearby: "contextLevelNearby",
  extended: "contextLevelExtended",
  full: "contextLevelFull",
};
const BACKLINK_CONTEXT_LEVEL_TOOLTIP_I18N_KEYS = {
  core: "contextTooltipCore",
  nearby: "contextTooltipNearby",
  extended: "contextTooltipExtended",
  full: "contextTooltipFull",
};

export { BACKLINK_CONTEXT_LEVEL_ORDER };

export function normalizeBacklinkContextLevel(level = "core") {
  return BACKLINK_CONTEXT_LEVEL_ORDER.includes(level) ? level : "core";
}

export function getBacklinkSummaryText(i18n = {}, documentCount = 0) {
  const template = i18n.findInBacklinkDocument || i18n.findInBacklink || "${x}";
  return template.replace("${x}", documentCount);
}

export function getBacklinkContextLevelLabel(level = "core", i18n = {}) {
  const fallback = BACKLINK_CONTEXT_LEVEL_LABELS[level] || BACKLINK_CONTEXT_LEVEL_LABELS.core;
  const key = BACKLINK_CONTEXT_LEVEL_LABEL_I18N_KEYS[level];
  return (key && i18n?.[key]) || fallback;
}

export function getBacklinkContextLevelTooltip(level = "core", i18n = {}) {
  const fallback = BACKLINK_CONTEXT_LEVEL_TOOLTIPS[level] || BACKLINK_CONTEXT_LEVEL_TOOLTIPS.core;
  const key = BACKLINK_CONTEXT_LEVEL_TOOLTIP_I18N_KEYS[level];
  return (key && i18n?.[key]) || fallback;
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
