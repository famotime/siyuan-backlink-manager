import { getBacklinkContextSourceRule } from "./backlink-context-rules.js";

export function resetBacklinkContextMatches(bundle) {
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

  for (const fieldKey of ["documentTitle", "headingPath", "listPath"]) {
    if (!bundle.metaInfo[fieldKey]) {
      continue;
    }
    bundle.metaInfo[fieldKey].matched = false;
    bundle.metaInfo[fieldKey].matchTypes = [];
    bundle.metaInfo[fieldKey].matchKeywords = [];
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

export function buildMatchSummary(fragment) {
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

export function matchMetaInfoFields(
  bundle,
  {
    includeText = [],
    excludeText = [],
    requireText = false,
    matchKeywords,
  } = {},
) {
  let matchText = false;

  for (const [fieldKey, label] of [["documentTitle", "文档"]]) {
    const field = bundle.metaInfo?.[fieldKey];
    if (!field?.searchable) {
      continue;
    }

    const fieldMatched = matchKeywords(
      field.searchText || "",
      includeText,
      excludeText,
    );
    if (requireText && fieldMatched) {
      matchText = true;
      field.matchTypes.push("text");
      field.matchKeywords.push(...includeText);
    }
    if (field.matchTypes.length > 0) {
      field.matched = true;
      bundle.metaInfo.matchedFieldKeys.push(field.key);
      bundle.metaInfo.primaryMatchKey = bundle.metaInfo.primaryMatchKey || field.key;
      bundle.metaInfo.matchSummaryList.push(
        buildMetaInfoMatchSummary(label, field.text),
      );
    }
  }

  return matchText;
}
