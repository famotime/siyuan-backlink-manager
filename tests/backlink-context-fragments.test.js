import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBacklinkContextVisibility,
  applyBacklinkContextVisibilityToNodes,
  buildBacklinkContextBundle,
  hydrateBacklinkContextBundles,
  matchBacklinkContextBundle,
} from "../src/service/backlink/backlink-context.js";
import {
  BACKLINK_CONTEXT_SOURCE_RULES,
  getBacklinkContextSourceRule,
  getBacklinkContextVisibilityLevelOrder,
} from "../src/service/backlink/backlink-context-rules.js";

function createBundleDeps() {
  return {
    getQueryStrByBlock: (block) => block?.markdown || "",
    getMarkdownAnchorTextArray: (markdown) => {
      const matches = [];
      if (markdown.includes("cur-anchor")) {
        matches.push("cur-anchor");
      }
      if (markdown.includes("parent-anchor")) {
        matches.push("parent-anchor");
      }
      return matches;
    },
    removeMarkdownRefBlockStyle: (markdown) => markdown.toLowerCase(),
    getRefBlockId: (markdown) => {
      const ids = [];
      if (markdown.includes("def-current")) {
        ids.push("def-current");
      }
      if (markdown.includes("def-parent")) {
        ids.push("def-parent");
      }
      if (markdown.includes("def-list")) {
        ids.push("def-list");
      }
      return ids;
    },
  };
}

test("buildBacklinkContextBundle materializes ordered fragments and default visible fragments", () => {
  const bundle = buildBacklinkContextBundle(
    {
      block: {
        id: "block-a",
        root_id: "doc-a",
        markdown: "self ((def-current 'cur-anchor'))",
      },
      documentBlock: {
        id: "doc-a",
        root_id: "doc-a",
        markdown: "document title",
      },
      parentMarkdown: "parent ((def-parent 'parent-anchor'))",
      headlineChildMarkdown: "headline child",
      previousSiblingMarkdown: "previous sibling",
      nextSiblingMarkdown: "next sibling",
      includeCurBlockDefBlockIds: new Set(["def-current"]),
      includeDirectDefBlockIds: new Set(["def-current"]),
      includeRelatedDefBlockIds: new Set(["def-parent"]),
      parentListItemTreeNode: null,
    },
    createBundleDeps(),
  );

  assert.deepEqual(
    bundle.fragments.map((fragment) => fragment.sourceType),
    ["self", "document", "parent", "child_headline", "sibling_prev", "sibling_next"],
  );
  assert.deepEqual(
    bundle.visibleFragments.map((fragment) => fragment.sourceType),
    ["self", "document"],
  );
  assert.equal(bundle.fragments[0].budgetPriority, 1);
  assert.equal(bundle.fragments[2].budgetPriority, 3);
  assert.ok(bundle.includeCurDocDefBlockIds.has("def-current"));
  assert.ok(bundle.includeRelatedDefBlockIds.has("def-parent"));
});

test("backlink context source rules cover every supported source with unified rule fields", () => {
  assert.deepEqual(Object.keys(BACKLINK_CONTEXT_SOURCE_RULES), [
    "self",
    "document",
    "parent",
    "child_headline",
    "child_list",
    "sibling_prev",
    "sibling_next",
    "expanded",
  ]);
  assert.deepEqual(getBacklinkContextSourceRule("self"), {
    label: "反链块",
    visibilityLevel: "core",
    defaultVisible: true,
    searchable: true,
    filterable: true,
    budgetPriority: 1,
    matchPriority: 1,
  });
  assert.equal(getBacklinkContextSourceRule("expanded").visibilityLevel, "extended");
  assert.equal(getBacklinkContextSourceRule("expanded").searchable, false);
  assert.equal(getBacklinkContextVisibilityLevelOrder("nearby"), 2);
  assert.equal(getBacklinkContextVisibilityLevelOrder("full"), 4);
});

test("hydrateBacklinkContextBundles attaches context fragments and bundle to backlink nodes", () => {
  const backlinkBlockNodeArray = [
    {
      block: {
        id: "block-a",
        root_id: "doc-a",
        markdown: "self",
      },
      documentBlock: {
        id: "doc-a",
        root_id: "doc-a",
        markdown: "document title",
      },
      parentMarkdown: "",
      headlineChildMarkdown: "",
      previousSiblingMarkdown: "",
      nextSiblingMarkdown: "",
      includeCurBlockDefBlockIds: new Set(),
      includeDirectDefBlockIds: new Set(),
      includeRelatedDefBlockIds: new Set(),
      parentListItemTreeNode: {
        includeChildIdArray: ["item-a"],
        excludeChildIdArray: [],
        getFilterMarkdown: () => "list child ((def-list 'list'))",
      },
    },
  ];

  hydrateBacklinkContextBundles(backlinkBlockNodeArray, createBundleDeps());

  assert.equal(backlinkBlockNodeArray[0].contextFragments.length, 3);
  assert.equal(backlinkBlockNodeArray[0].contextBundle.fragments.length, 3);
  assert.ok(backlinkBlockNodeArray[0].contextBundle.includeRelatedDefBlockIds.has("def-list"));
});

test("matchBacklinkContextBundle records matched fragments, primary source, and summaries", () => {
  const bundle = buildBacklinkContextBundle(
    {
      block: {
        id: "block-a",
        root_id: "doc-a",
        markdown: "self hit",
      },
      documentBlock: {
        id: "doc-a",
        root_id: "doc-a",
        markdown: "doc title",
      },
      parentMarkdown: "parent context target-hit",
      headlineChildMarkdown: "",
      previousSiblingMarkdown: "",
      nextSiblingMarkdown: "",
      includeCurBlockDefBlockIds: new Set(),
      includeDirectDefBlockIds: new Set(),
      includeRelatedDefBlockIds: new Set(),
      parentListItemTreeNode: null,
    },
    createBundleDeps(),
  );

  const result = matchBacklinkContextBundle(bundle, {
    keywordObj: {
      includeText: ["target-hit"],
      excludeText: [],
      includeAnchor: [],
      excludeAnchor: [],
    },
    matchKeywords: (content, includeText, excludeText) =>
      includeText.every((keyword) => content.includes(keyword)) &&
      excludeText.every((keyword) => !content.includes(keyword)),
  });

  assert.equal(result.matchText, true);
  assert.equal(bundle.matchedFragments.length, 1);
  assert.equal(bundle.matchedFragments[0].sourceType, "parent");
  assert.equal(bundle.primaryMatchSourceType, "parent");
  assert.equal(bundle.matchSummaryList.length, 1);
  assert.match(bundle.matchSummaryList[0], /父级/);
});

test("applyBacklinkContextVisibility exposes fragments by visibility level", () => {
  const bundle = buildBacklinkContextBundle(
    {
      block: {
        id: "block-a",
        root_id: "doc-a",
        markdown: "self",
      },
      documentBlock: {
        id: "doc-a",
        root_id: "doc-a",
        markdown: "doc title",
      },
      parentMarkdown: "parent context",
      headlineChildMarkdown: "headline child",
      previousSiblingMarkdown: "previous sibling",
      nextSiblingMarkdown: "next sibling",
      includeCurBlockDefBlockIds: new Set(),
      includeDirectDefBlockIds: new Set(),
      includeRelatedDefBlockIds: new Set(),
      parentListItemTreeNode: null,
    },
    createBundleDeps(),
  );
  bundle.fragments.push({
    id: "block-a:expanded:99",
    sourceType: "expanded",
    visibilityLevel: "extended",
    defaultVisible: false,
    searchable: false,
  });

  applyBacklinkContextVisibility(bundle, "core");
  assert.deepEqual(
    bundle.visibleFragments.map((fragment) => fragment.sourceType),
    ["self", "document"],
  );

  applyBacklinkContextVisibility(bundle, "nearby");
  assert.deepEqual(
    bundle.visibleFragments.map((fragment) => fragment.sourceType),
    ["self", "document", "parent", "child_headline", "sibling_prev", "sibling_next"],
  );

  applyBacklinkContextVisibility(bundle, "extended");
  assert.equal(bundle.visibleFragments.at(-1).sourceType, "expanded");
});

test("applyBacklinkContextVisibilityToNodes updates every node bundle in place", () => {
  const backlinkBlockNodeArray = [
    {
      contextBundle: {
        fragments: [
          { sourceType: "self", visibilityLevel: "core", defaultVisible: true },
          { sourceType: "parent", visibilityLevel: "nearby", defaultVisible: false },
        ],
      },
    },
  ];

  applyBacklinkContextVisibilityToNodes(backlinkBlockNodeArray, "nearby");

  assert.deepEqual(
    backlinkBlockNodeArray[0].contextBundle.visibleFragments.map((fragment) => fragment.sourceType),
    ["self", "parent"],
  );
});
