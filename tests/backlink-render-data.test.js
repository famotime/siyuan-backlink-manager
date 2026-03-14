import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLegacyBacklinkSearchText,
  formatBacklinkDocApiKeyword,
  getBatchBacklinkDoc,
  isBacklinkBlockValid,
} from "../src/service/backlink/backlink-render-data.js";

test("formatBacklinkDocApiKeyword keeps the longest segment and truncates it to 80 chars", () => {
  const longSegment = "x".repeat(100);

  assert.equal(formatBacklinkDocApiKeyword(`a'bigger'${longSegment}`), longSegment.slice(0, 80));
  assert.equal(formatBacklinkDocApiKeyword(""), "");
});

test("buildLegacyBacklinkSearchText counts document markdown only once", () => {
  const result = buildLegacyBacklinkSearchText({
    selfMarkdown: "self",
    documentMarkdown: "document",
    parentMarkdown: "parent",
    headlineChildMarkdown: "headline",
    previousSiblingMarkdown: "prev",
    nextSiblingMarkdown: "next",
    listItemChildMarkdown: "list",
  });

  assert.equal(result, "selfdocumentparentheadlineprevnextlist");
  assert.equal(result.includes("documentdocument"), false);
});

test("getBatchBacklinkDoc deduplicates backlink dom results and preserves backlink block order", async () => {
  const backlinkBlockNodeArray = [
    {
      block: { id: "block-a", parent_id: "parent-a", root_id: "doc-a", content: "Alpha" },
      includeCurBlockDefBlockIds: new Set(["def-a"]),
      includeDirectDefBlockIds: new Set(["def-a"]),
      contextBundle: {
        primaryMatchSourceType: "parent",
        matchSummaryList: ["父级：Alpha"],
      },
      parentListItemTreeNode: null,
    },
    {
      block: { id: "block-b", parent_id: "parent-b", root_id: "doc-b", content: "Beta" },
      includeCurBlockDefBlockIds: new Set(["def-b"]),
      includeDirectDefBlockIds: new Set(["def-b"]),
      contextBundle: {
        primaryMatchSourceType: "sibling_prev",
        matchSummaryList: ["前相邻块：Beta"],
      },
      parentListItemTreeNode: {
        includeChildIdArray: ["child-1"],
        excludeChildIdArray: ["child-2"],
      },
    },
  ];

  const result = await getBatchBacklinkDoc({
    curRootId: "current-doc",
    backlinkBlockNodeArray,
    deps: {
      intersectionSet: (setA, setB) => [...setA].filter((item) => setB.has(item)),
      longestCommonSubstring: (a) => a,
      getBacklinkDocByApiOrCache: async (_rootId, defId) => ({
        usedCache: defId === "def-a",
        backlinks:
          defId === "def-a"
            ? [
                { dom: "<div data-node-id='block-b'></div>" },
                { dom: "<div data-node-id='block-a'></div>" },
              ]
            : [
                { dom: "<div data-node-id='block-b'></div>" },
              ],
      }),
      getBacklinkBlockId: (dom) => dom.match(/data-node-id='([^']+)'/)[1],
      triggerIncompleteBacklinkFetch: () => {},
    },
  });

  assert.equal(result.usedCache, true);
  assert.deepEqual(
    result.backlinks.map((item) => item.backlinkBlock.id),
    ["block-a", "block-b"],
  );
  assert.equal(result.backlinks[0].contextBundle.primaryMatchSourceType, "parent");
  assert.equal(result.backlinks[1].contextBundle.matchSummaryList[0], "前相邻块：Beta");
  assert.deepEqual(result.backlinks[1].includeChildListItemIdArray, ["child-1"]);
  assert.deepEqual(result.backlinks[1].excludeChildLisetItemIdArray, ["child-2"]);
});

test("isBacklinkBlockValid matches keywords from sibling markdown", () => {
  const result = isBacklinkBlockValid(
    {
      backlinkKeywordStr: "sibling-hit",
      includeRelatedDefBlockIds: new Set(),
      excludeRelatedDefBlockIds: new Set(),
      includeDocumentIds: new Set(),
      excludeDocumentIds: new Set(),
      backlinkCurDocDefBlockType: "",
    },
    {
      block: { root_id: "doc-a", markdown: "self" },
      documentBlock: { markdown: "doc" },
      includeDirectDefBlockIds: new Set(),
      includeRelatedDefBlockIds: new Set(),
      includeParentDefBlockIds: new Set(),
      parentListItemTreeNode: null,
      dynamicAnchorMap: new Map(),
      staticAnchorMap: new Map(),
      parentMarkdown: "",
      headlineChildMarkdown: "",
      previousSiblingMarkdown: "sibling-hit",
      nextSiblingMarkdown: "",
    },
    {
      isSetNotEmpty: (value) => value && value.size > 0,
      parseSearchSyntax: (value) => ({
        includeText: [value],
        excludeText: [],
        includeAnchor: [],
        excludeAnchor: [],
      }),
      getQueryStrByBlock: (block) => block?.markdown || "",
      getMarkdownAnchorTextArray: () => [],
      removeMarkdownRefBlockStyle: (markdown) => markdown,
      matchKeywords: (content, includeText, excludeText) =>
        includeText.every((keyword) => content.includes(keyword)) &&
        excludeText.every((keyword) => !content.includes(keyword)),
    },
  );

  assert.equal(result, true);
});

test("isBacklinkBlockValid matches keywords from context fragments when available", () => {
  const backlinkBlockNode = {
    block: { root_id: "doc-a", markdown: "" },
    documentBlock: { markdown: "" },
    includeDirectDefBlockIds: new Set(),
    includeRelatedDefBlockIds: new Set(),
    includeParentDefBlockIds: new Set(),
    parentListItemTreeNode: null,
    dynamicAnchorMap: new Map(),
    staticAnchorMap: new Map(),
    parentMarkdown: "",
    headlineChildMarkdown: "",
    previousSiblingMarkdown: "",
    nextSiblingMarkdown: "",
    contextBundle: {
      fragments: [
        {
          sourceType: "sibling_prev",
          searchText: "fragment-hit",
          displayText: "fragment-hit",
          anchorText: "",
          searchable: true,
          matched: false,
          matchTypes: [],
          matchKeywords: [],
        },
      ],
      matchedFragments: [],
      matchSummaryList: [],
    },
  };
  const result = isBacklinkBlockValid(
    {
      backlinkKeywordStr: "fragment-hit",
      includeRelatedDefBlockIds: new Set(),
      excludeRelatedDefBlockIds: new Set(),
      includeDocumentIds: new Set(),
      excludeDocumentIds: new Set(),
      backlinkCurDocDefBlockType: "",
    },
    backlinkBlockNode,
    {
      isSetNotEmpty: (value) => value && value.size > 0,
      parseSearchSyntax: (value) => ({
        includeText: [value],
        excludeText: [],
        includeAnchor: [],
        excludeAnchor: [],
      }),
      getQueryStrByBlock: (block) => block?.markdown || "",
      getMarkdownAnchorTextArray: () => [],
      removeMarkdownRefBlockStyle: (markdown) => markdown,
      matchKeywords: (content, includeText, excludeText) =>
        includeText.every((keyword) => content.includes(keyword)) &&
        excludeText.every((keyword) => !content.includes(keyword)),
    },
  );

  assert.equal(result, true);
  assert.equal(backlinkBlockNode.contextBundle.matchedFragments.length, 1);
  assert.equal(backlinkBlockNode.contextBundle.primaryMatchSourceType, "sibling_prev");
  assert.equal(backlinkBlockNode.contextBundle.matchSummaryList.length, 1);
});
