import test from "node:test";
import assert from "node:assert/strict";

import {
  collectBacklinkBlocks,
  collectSiblingBlocks,
} from "../src/service/backlink/backlink-panel-data-collectors.js";
import { updateMapCount, updateMaxValueMap } from "./helpers/predicates.js";

function createCollectorContext() {
  return {
    curDocDefBlockIdArray: ["def-current"],
    backlinkBlockMap: {},
    relatedDefBlockCountMap: new Map(),
    backlinkDocumentCountMap: new Map(),
    relatedDefBlockDynamicAnchorMap: new Map(),
    relatedDefBlockStaticAnchorMap: new Map(),
    backlinkBlockCreatedMap: new Map(),
    backlinkBlockUpdatedMap: new Map(),
  };
}

test("collectBacklinkBlocks builds backlink nodes and updates related/document counters", async () => {
  const context = createCollectorContext();

  await collectBacklinkBlocks({
    backlinkBlockArray: [
      {
        id: "block-a",
        root_id: "doc-a",
        parent_id: "parent-a",
        markdown:
          "content ((20240101010101-abcdefg 'dyn-anchor')) ((20240101010102-bcdefgh \"static-anchor\"))",
        content: "content",
        created: "11",
        updated: "22",
        type: "p",
      },
    ],
    curDocDefBlockArray: [],
    getBacklinkEmbedBlockInfo: async () => ({
      embedBlockmarkdown: "",
      relatedDefBlockIdArray: [],
    }),
    createBacklinkBlockNode: (backlinkBlock) => ({
      block: { ...backlinkBlock, refCount: null },
      documentBlock: null,
      parentMarkdown: "",
      listItemChildMarkdown: "",
      headlineChildMarkdown: "",
      includeDirectDefBlockIds: new Set(),
      includeRelatedDefBlockIds: new Set(),
      includeCurBlockDefBlockIds: new Set(),
      includeParentDefBlockIds: new Set(),
      dynamicAnchorMap: new Map(),
      staticAnchorMap: new Map(),
    }),
    updateDynamicAnchorMap: (map, markdown) => {
      map.set("20240101010101-abcdefg", new Set([markdown.includes("dyn-anchor") ? "dyn-anchor" : ""]));
    },
    updateStaticAnchorMap: (map, markdown) => {
      map.set("20240101010102-bcdefgh", new Set([markdown.includes("static-anchor") ? "static-anchor" : ""]));
    },
    getRefBlockId: (markdown) =>
      markdown.includes("20240101010101-abcdefg")
        ? ["20240101010101-abcdefg", "20240101010102-bcdefgh"]
        : [],
    updateMaxValueMap,
    updateMapCount,
    context,
  });

  assert.equal(Object.keys(context.backlinkBlockMap).length, 1);
  assert.equal(context.relatedDefBlockCountMap.get("20240101010101-abcdefg"), 1);
  assert.equal(context.relatedDefBlockCountMap.get("20240101010102-bcdefgh"), 1);
  assert.equal(context.backlinkDocumentCountMap.get("doc-a"), 1);
  assert.deepEqual(
    [...context.backlinkBlockMap["block-a"].includeCurBlockDefBlockIds],
    ["20240101010101-abcdefg", "20240101010102-bcdefgh"],
  );
});

test("collectSiblingBlocks appends previous and next sibling markdown and tracks sibling def block ids", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a", created: "11", updated: "22" },
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    previousSiblingMarkdown: "",
    nextSiblingMarkdown: "",
  };

  collectSiblingBlocks({
    backlinkSiblingBlockGroupArray: [
      {
        backlinkBlockId: "block-a",
        previousSiblingBlock: {
          id: "block-prev",
          markdown: "prev ((def-current 'current'))",
          name: "",
          alias: "",
          memo: "",
        },
        nextSiblingBlock: {
          id: "block-next",
          markdown: "next ((def-next 'next'))",
          name: "",
          alias: "",
          memo: "",
        },
      },
    ],
    getRefBlockId: (markdown) => {
      if (markdown.includes("def-current")) {
        return ["def-current"];
      }
      if (markdown.includes("def-next")) {
        return ["def-next"];
      }
      return [];
    },
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMaxValueMap,
    updateMapCount,
    context,
  });

  assert.equal(
    context.backlinkBlockMap["block-a"].previousSiblingMarkdown,
    "prev ((def-current 'current'))",
  );
  assert.equal(
    context.backlinkBlockMap["block-a"].nextSiblingMarkdown,
    "next ((def-next 'next'))",
  );
  assert.ok(context.backlinkBlockMap["block-a"].includeDirectDefBlockIds.has("def-current"));
  assert.ok(context.backlinkBlockMap["block-a"].includeRelatedDefBlockIds.has("def-next"));
  assert.equal(context.relatedDefBlockCountMap.get("def-next"), 1);
});

test("collectSiblingBlocks ignores null sibling blocks", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a", created: "11", updated: "22" },
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    previousSiblingMarkdown: "",
    nextSiblingMarkdown: "",
  };

  assert.doesNotThrow(() => {
    collectSiblingBlocks({
      backlinkSiblingBlockGroupArray: [
        {
          backlinkBlockId: "block-a",
          previousSiblingBlock: null,
          nextSiblingBlock: {
            id: "block-next",
            markdown: "next ((def-next 'next'))",
            name: "",
            alias: "",
            memo: "",
          },
        },
      ],
      getRefBlockId: (markdown) =>
        markdown.includes("def-next") ? ["def-next"] : [],
      updateDynamicAnchorMap: () => {},
      updateStaticAnchorMap: () => {},
      updateMaxValueMap,
      updateMapCount,
      context,
    });
  });

  assert.equal(context.backlinkBlockMap["block-a"].previousSiblingMarkdown, "");
  assert.equal(
    context.backlinkBlockMap["block-a"].nextSiblingMarkdown,
    "next ((def-next 'next'))",
  );
});

test("collectSiblingBlocks uses list item subtree markdown for sibling list items", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a", created: "11", updated: "22" },
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    previousSiblingMarkdown: "",
    nextSiblingMarkdown: "",
  };

  collectSiblingBlocks({
    backlinkSiblingBlockGroupArray: [
      {
        backlinkBlockId: "block-a",
        previousSiblingBlock: {
          id: "item-prev",
          type: "i",
          markdown: "",
          subMarkdown: "prev item ((def-current 'current'))",
          parentInAttrConcat: " parent-prev",
          subInAttrConcat: " child-prev",
          name: "",
          alias: "",
          memo: "",
        },
        nextSiblingBlock: {
          id: "item-next",
          type: "i",
          markdown: "",
          subMarkdown: "next item ((def-next 'next'))",
          parentInAttrConcat: " parent-next",
          subInAttrConcat: " child-next",
          name: "",
          alias: "",
          memo: "",
        },
      },
    ],
    getRefBlockId: (markdown) => {
      if (markdown.includes("def-current")) {
        return ["def-current"];
      }
      if (markdown.includes("def-next")) {
        return ["def-next"];
      }
      return [];
    },
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMaxValueMap,
    updateMapCount,
    context,
  });

  assert.equal(
    context.backlinkBlockMap["block-a"].previousSiblingMarkdown,
    "prev item ((def-current 'current')) parent-prev child-prev",
  );
  assert.equal(
    context.backlinkBlockMap["block-a"].nextSiblingMarkdown,
    "next item ((def-next 'next')) parent-next child-next",
  );
});

test("collectSiblingBlocks stores expanded sibling markdown separately", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a", created: "11", updated: "22" },
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    previousSiblingMarkdown: "",
    nextSiblingMarkdown: "",
    expandedMarkdown: "",
    expandedRenderMarkdown: "",
  };

  collectSiblingBlocks({
    backlinkSiblingBlockGroupArray: [
      {
        backlinkBlockId: "block-a",
        previousSiblingBlock: {
          id: "item-prev",
          type: "i",
          markdown: "",
          subMarkdown: "prev item",
          parentInAttrConcat: "",
          subInAttrConcat: "",
          renderMarkdown: "- prev item",
        },
        nextSiblingBlock: {
          id: "item-next",
          type: "i",
          markdown: "",
          subMarkdown: "next item",
          parentInAttrConcat: "",
          subInAttrConcat: "",
          renderMarkdown: "- next item",
        },
        expandedSiblingBlocks: [
          {
            id: "item-extra-a",
            type: "i",
            markdown: "",
            subMarkdown: "extra item a",
            parentInAttrConcat: "",
            subInAttrConcat: "",
            renderMarkdown: "- extra item a",
          },
          {
            id: "item-extra-b",
            type: "i",
            markdown: "",
            subMarkdown: "extra item b",
            parentInAttrConcat: "",
            subInAttrConcat: "",
            renderMarkdown: "- extra item b",
          },
        ],
      },
    ],
    getRefBlockId: () => [],
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMaxValueMap: () => {},
    updateMapCount: () => {},
    context,
  });

  assert.equal(
    context.backlinkBlockMap["block-a"].expandedMarkdown,
    "extra item a\n\nextra item b",
  );
  assert.equal(
    context.backlinkBlockMap["block-a"].expandedRenderMarkdown,
    "- extra item a\n\n- extra item b",
  );
  assert.equal(context.backlinkBlockMap["block-a"].previousSiblingBlockId, "item-prev");
  assert.equal(context.backlinkBlockMap["block-a"].nextSiblingBlockId, "item-next");
  assert.deepEqual(
    context.backlinkBlockMap["block-a"].beforeExpandedBlockIdArray,
    [],
  );
  assert.deepEqual(
    context.backlinkBlockMap["block-a"].afterExpandedBlockIdArray,
    [],
  );
});
