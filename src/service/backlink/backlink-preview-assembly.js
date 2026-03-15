import { removeMarkdownRefBlockStyle } from "./backlink-markdown.js";
import { getBacklinkContextVisibilityLevelOrder } from "./backlink-context-rules.js";

const BACKLINK_PREVIEW_SOURCE_ORDER = {
  core: ["self"],
  nearby: ["sibling_prev", "self", "sibling_next"],
  extended: [
    "parent",
    "sibling_prev",
    "self",
    "sibling_next",
    "child_headline",
    "child_list",
    "expanded",
  ],
};

const BACKLINK_PREVIEW_SOURCE_PRIORITY = {
  self: 1,
  sibling_prev: 2,
  sibling_next: 2,
  parent: 3,
  child_headline: 4,
  child_list: 5,
  expanded: 6,
};

function normalizePreviewLevel(level = "core") {
  if (level === "nearby" || level === "extended") {
    return level;
  }
  return "core";
}

function normalizeFragmentText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function stripKramdownIAL(text = "") {
  return String(text || "").replace(/\n?\{:[^}\n]+\}\s*/g, "\n").trim();
}

function compactLooseListItemMarkdown(markdown = "") {
  const segmentArray = String(markdown || "")
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segmentArray.length <= 0) {
    return "";
  }

  return segmentArray
    .map((segment) => {
      const lines = segment
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length <= 0) {
        return "";
      }

      const markerMatch = lines[0].match(/^((?:[*+-])|(?:\d+\.))\s*$/);
      if (!markerMatch) {
        return lines.join("\n").trim();
      }

      const contentLines = lines.slice(1);
      if (contentLines.length <= 0) {
        return markerMatch[1];
      }

      return `${markerMatch[1]} ${contentLines.join(" ")}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function normalizePreviewRenderMarkdown(markdown = "") {
  return compactLooseListItemMarkdown(
    stripKramdownIAL(removeMarkdownRefBlockStyle(String(markdown || ""))),
  );
}

function indentMarkdown(markdown = "", indent = "  ") {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => (line ? `${indent}${line}` : line))
    .join("\n");
}

function isListItemMarkdown(markdown = "") {
  const firstLine = String(markdown || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find(Boolean);
  return /^((?:[*+-])|(?:\d+\.))\s+/.test(firstLine || "");
}

function shouldNestPreviewBody(parentMarkdown = "", bodyMarkdownArray = []) {
  if (!isListItemMarkdown(parentMarkdown)) {
    return false;
  }
  return bodyMarkdownArray.every((markdown) => isListItemMarkdown(markdown));
}

function assemblePreviewMarkdownFromSequence(sequence = []) {
  const normalizedSequence = sequence
    .map((item) => ({
      ...item,
      renderMarkdown: normalizePreviewRenderMarkdown(item?.renderMarkdown || item?.text || ""),
    }))
    .filter((item) => item.renderMarkdown);
  if (normalizedSequence.length <= 0) {
    return "";
  }

  const parentIndex = normalizedSequence.findIndex(
    (item) => item.sequenceRole === "parent",
  );
  if (parentIndex >= 0 && parentIndex < normalizedSequence.length - 1) {
    const parentItem = normalizedSequence[parentIndex];
    const bodyItems = normalizedSequence.filter((_, index) => index > parentIndex);
    if (parentItem && bodyItems.length > 0) {
      const bodyMarkdownArray = bodyItems.map((item) => item.renderMarkdown);
      if (shouldNestPreviewBody(parentItem.renderMarkdown, bodyMarkdownArray)) {
        const prefixItems = normalizedSequence.slice(0, parentIndex);
        const prefixMarkdown = prefixItems.map((item) => item.renderMarkdown).join("\n\n");
        const nestedBodyMarkdown = bodyMarkdownArray
          .map((markdown) => indentMarkdown(markdown))
          .join("\n\n");
        return [prefixMarkdown, parentItem.renderMarkdown, nestedBodyMarkdown]
          .filter(Boolean)
          .join("\n\n");
      }
    }
  }

  return normalizedSequence.map((item) => item.renderMarkdown).join("\n\n");
}

function getPreviewSequence({ contextVisibilityLevel = "core", contextBundle = null } = {}) {
  const visibilityLevel = normalizePreviewLevel(contextVisibilityLevel);
  const sequence = contextBundle?.previewSequence?.[visibilityLevel];
  return Array.isArray(sequence) ? sequence : [];
}

function getPreviewFragmentDedupeKey(fragment = {}) {
  return normalizeFragmentText(
    normalizePreviewRenderMarkdown(fragment.renderMarkdown || fragment.text || ""),
  );
}

function getPreviewSourceOrder(sourceType, visibilityLevel) {
  const sourceOrder = BACKLINK_PREVIEW_SOURCE_ORDER[visibilityLevel];
  const index = sourceOrder.indexOf(sourceType);
  return index >= 0 ? index : sourceOrder.length;
}

function getPreviewSourcePriority(sourceType) {
  return BACKLINK_PREVIEW_SOURCE_PRIORITY[sourceType] || 99;
}

function dedupePreviewFragments(fragments = [], visibilityLevel = "core") {
  const fragmentByText = new Map();

  for (const fragment of fragments) {
    const dedupeKey = getPreviewFragmentDedupeKey(fragment);
    if (!dedupeKey) {
      continue;
    }

    const existingFragment = fragmentByText.get(dedupeKey);
    if (!existingFragment) {
      fragmentByText.set(dedupeKey, fragment);
      continue;
    }

    const existingPriority = getPreviewSourcePriority(existingFragment.sourceType);
    const nextPriority = getPreviewSourcePriority(fragment.sourceType);
    if (nextPriority < existingPriority) {
      fragmentByText.set(dedupeKey, fragment);
      continue;
    }

    if (
      nextPriority === existingPriority &&
      getPreviewSourceOrder(fragment.sourceType, visibilityLevel) <
        getPreviewSourceOrder(existingFragment.sourceType, visibilityLevel)
    ) {
      fragmentByText.set(dedupeKey, fragment);
    }
  }

  return Array.from(fragmentByText.values()).sort((fragmentA, fragmentB) => {
    const sourceOrderResult =
      getPreviewSourceOrder(fragmentA.sourceType, visibilityLevel) -
      getPreviewSourceOrder(fragmentB.sourceType, visibilityLevel);
    if (sourceOrderResult !== 0) {
      return sourceOrderResult;
    }
    return (fragmentA.order || 0) - (fragmentB.order || 0);
  });
}

export function selectBacklinkPreviewFragments({
  contextVisibilityLevel = "core",
  contextBundle = null,
} = {}) {
  const visibilityLevel = normalizePreviewLevel(contextVisibilityLevel);
  const sourceOrder = BACKLINK_PREVIEW_SOURCE_ORDER[visibilityLevel];
  const candidateFragments = Array.isArray(contextBundle?.fragments)
    ? contextBundle.fragments.filter((fragment) => {
        const fragmentLevelOrder = getBacklinkContextVisibilityLevelOrder(
          fragment?.visibilityLevel || "full",
        );
        return (
          fragmentLevelOrder <=
          getBacklinkContextVisibilityLevelOrder(visibilityLevel)
        );
      })
    : Array.isArray(contextBundle?.visibleFragments)
      ? contextBundle.visibleFragments
      : [];

  const selectedFragments = candidateFragments
    .filter((fragment) => {
      if (!fragment || !sourceOrder.includes(fragment.sourceType)) {
        return false;
      }
      return normalizeFragmentText(fragment.renderMarkdown || fragment.text).length > 0;
    })
    .sort((fragmentA, fragmentB) => {
      const sourceOrderResult =
        getPreviewSourceOrder(fragmentA.sourceType, visibilityLevel) -
        getPreviewSourceOrder(fragmentB.sourceType, visibilityLevel);
      if (sourceOrderResult !== 0) {
        return sourceOrderResult;
      }
      return (fragmentA.order || 0) - (fragmentB.order || 0);
    });

  return dedupePreviewFragments(selectedFragments, visibilityLevel);
}

export function buildBacklinkPreviewBacklinkData({
  activeBacklink = null,
  contextVisibilityLevel = "core",
  deps = {},
} = {}) {
  if (!activeBacklink) {
    return [];
  }

  const previewFragments = selectBacklinkPreviewFragments({
    contextVisibilityLevel,
    contextBundle: activeBacklink.contextBundle,
  });
  const previewSequence = getPreviewSequence({
    contextVisibilityLevel,
    contextBundle: activeBacklink.contextBundle,
  });
  if (previewFragments.length <= 0 && previewSequence.length <= 0) {
    return [activeBacklink];
  }

  const markdownToBlockDOM =
    typeof deps.markdownToBlockDOM === "function"
      ? deps.markdownToBlockDOM
      : null;
  if (!markdownToBlockDOM) {
    return [activeBacklink];
  }

  if (previewSequence.length > 0 && contextVisibilityLevel !== "core") {
    const previewMarkdown = assemblePreviewMarkdownFromSequence(previewSequence);
    if (previewMarkdown) {
      const previewDom = markdownToBlockDOM(previewMarkdown);
      if (previewDom) {
        return [
          {
            ...activeBacklink,
            dom: previewDom,
            previewFragments,
          },
        ];
      }
    }
  }

  if (
    previewFragments.length === 1 &&
    previewFragments[0]?.sourceType === "self" &&
    activeBacklink.dom
  ) {
    return [activeBacklink];
  }

  const previewBacklinkData = previewFragments
    .map((fragment) => {
      const fragmentMarkdown = normalizePreviewRenderMarkdown(
        fragment.renderMarkdown || fragment.text || "",
      );
      if (!fragmentMarkdown) {
        return null;
      }

      const fragmentDom =
        fragment.sourceType === "self" && activeBacklink.dom
          ? activeBacklink.dom
          : markdownToBlockDOM(fragmentMarkdown);
      if (!fragmentDom) {
        return null;
      }
      return {
        ...activeBacklink,
        dom: fragmentDom,
        previewFragments: [fragment],
      };
    })
    .filter(Boolean);

  return previewBacklinkData.length > 0 ? previewBacklinkData : [activeBacklink];
}
