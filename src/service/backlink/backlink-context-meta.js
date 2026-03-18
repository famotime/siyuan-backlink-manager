import { getBacklinkContextSourceRule } from "./backlink-context-rules.js";

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

export function createBacklinkContextMetaInfo(backlinkBlockNode, deps) {
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
