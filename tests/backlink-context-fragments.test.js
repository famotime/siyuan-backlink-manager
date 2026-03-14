import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkContextBundle,
  hydrateBacklinkContextBundles,
} from "../src/service/backlink/backlink-context.js";

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
  assert.ok(bundle.includeCurDocDefBlockIds.has("def-current"));
  assert.ok(bundle.includeRelatedDefBlockIds.has("def-parent"));
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
