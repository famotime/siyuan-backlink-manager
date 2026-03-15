import test from "node:test";
import assert from "node:assert/strict";

import {
  collectBacklinkBlocks,
  collectHeadlineChildBlocks,
  collectListItemTreeNodes,
  collectParentBlocks,
  collectSiblingBlocks,
} from "../src/service/backlink/backlink-panel-data-collectors.js";

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
    updateMaxValueMap: (map, key, value) => map.set(key, value),
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
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

test("collectHeadlineChildBlocks appends markdown and only counts new related ids", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: {
      id: "block-a",
      root_id: "doc-a",
      created: "11",
      updated: "22",
    },
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    includeParentDefBlockIds: new Set(),
    headlineChildMarkdown: "",
  };

  collectHeadlineChildBlocks({
    headlinkBacklinkChildBlockArray: [
      {
        markdown: "headline ((def-current 'current')) ((def-new 'new'))",
        subInAttrConcat: " extra",
        parentIdPath: "block-a->headline",
      },
    ],
    relatedDefBlockIdSet: new Set(["def-existing"]),
    getRefBlockId: () => ["def-current", "def-new"],
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMaxValueMap: (map, key, value) => map.set(key, value),
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
    context,
  });

  assert.equal(
    context.backlinkBlockMap["block-a"].headlineChildMarkdown,
    "headline ((def-current 'current')) ((def-new 'new')) extra",
  );
  assert.ok(context.backlinkBlockMap["block-a"].includeDirectDefBlockIds.has("def-current"));
  assert.equal(context.relatedDefBlockCountMap.get("def-new"), 1);
});

test("collectListItemTreeNodes attaches tree nodes and updates related/document counters", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: {
      id: "block-a",
      parent_id: "list-a",
      root_id: "doc-a",
      markdown: "root markdown",
      created: "11",
      updated: "22",
    },
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
  };
  const treeNode = {
    id: "list-a",
    getAllMarkdown() {
      return "root markdown ((def-new 'new'))";
    },
  };

  collectListItemTreeNodes({
    listItemTreeNodeArray: [treeNode],
    getRefBlockId: () => ["def-new"],
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMaxValueMap: (map, key, value) => map.set(key, value),
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
    context,
  });

  assert.strictEqual(context.backlinkBlockMap["block-a"].parentListItemTreeNode, treeNode);
  assert.ok(context.backlinkBlockMap["block-a"].includeRelatedDefBlockIds.has("def-new"));
  assert.equal(context.relatedDefBlockCountMap.get("def-new"), 1);
  assert.equal(context.backlinkDocumentCountMap.get("doc-a"), 1);
});

test("collectParentBlocks appends parent markdown and tracks parent def block ids", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a" },
    includeRelatedDefBlockIds: new Set(),
    includeParentDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    parentMarkdown: "",
    parentRenderMarkdown: "",
  };

  collectParentBlocks({
    backlinkParentBlockArray: [
      {
        id: "item-parent",
        markdown: "- 父节点",
        inAttrConcat: "",
        type: "i",
        childIdPath: "block-a->item-parent",
      },
      {
        markdown: "parent ((def-current 'current')) ((def-parent 'parent'))",
        inAttrConcat: " extra",
        type: "h",
        childIdPath: "block-a->child->heading",
      },
    ],
    relatedDefBlockIdSet: new Set(),
    getRefBlockId: (markdown) =>
      markdown.includes("def-parent") ? ["def-current", "def-parent"] : [],
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
    context,
  });

  assert.equal(
    context.backlinkBlockMap["block-a"].parentMarkdown,
    "- 父节点\n\nparent ((def-current 'current')) ((def-parent 'parent')) extra",
  );
  assert.equal(
    context.backlinkBlockMap["block-a"].parentRenderMarkdown,
    "parent ((def-current 'current')) ((def-parent 'parent'))\n\n- 父节点",
  );
  assert.ok(context.backlinkBlockMap["block-a"].includeDirectDefBlockIds.has("def-current"));
  assert.ok(context.backlinkBlockMap["block-a"].includeParentDefBlockIds.has("def-parent"));
  assert.equal(context.relatedDefBlockCountMap.get("def-parent"), 1);
});

test("collectParentBlocks renders heading parents from outer to inner order", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a" },
    includeRelatedDefBlockIds: new Set(),
    includeParentDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    parentMarkdown: "",
    parentRenderMarkdown: "",
  };

  collectParentBlocks({
    backlinkParentBlockArray: [
      {
        id: "heading-inner",
        markdown: "### 1. Skills 是什么？",
        inAttrConcat: "",
        type: "h",
        childIdPath: "block-a->heading-inner",
      },
      {
        id: "heading-outer",
        markdown: "## 二、Skills：让 Claude 真正「学会干活」",
        inAttrConcat: "",
        type: "h",
        childIdPath: "block-a->heading-inner->heading-outer",
      },
    ],
    relatedDefBlockIdSet: new Set(),
    getRefBlockId: () => [],
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMapCount: () => {},
    context,
  });

  assert.equal(
    context.backlinkBlockMap["block-a"].parentRenderMarkdown,
    "## 二、Skills：让 Claude 真正「学会干活」\n\n### 1. Skills 是什么？",
  );
  assert.deepEqual(
    context.backlinkBlockMap["block-a"].parentContextBlockIds,
    ["heading-outer", "heading-inner"],
  );
});

test("collectParentBlocks keeps the parent list item title in render markdown without appending its subtree", () => {
  const context = createCollectorContext();
  context.backlinkBlockMap["block-a"] = {
    block: { id: "block-a", root_id: "doc-a" },
    includeRelatedDefBlockIds: new Set(),
    includeParentDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
    parentMarkdown: "",
    parentRenderMarkdown: "",
  };

  collectParentBlocks({
    backlinkParentBlockArray: [
      {
        id: "item-parent",
        markdown: "- 上层节点\n\n  - 扩展\n  - 近邻",
        subMarkdown: "- 扩展\n- 近邻\n- 标题字体",
        inAttrConcat: "",
        type: "i",
        childIdPath: "block-a->item-parent",
      },
    ],
    relatedDefBlockIdSet: new Set(),
    getRefBlockId: () => [],
    updateDynamicAnchorMap: () => {},
    updateStaticAnchorMap: () => {},
    updateMapCount: () => {},
    context,
  });

  assert.equal(context.backlinkBlockMap["block-a"].parentRenderMarkdown, "- 上层节点");
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
    updateMaxValueMap: (map, key, value) => map.set(key, value),
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
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
      updateMaxValueMap: (map, key, value) => map.set(key, value),
      updateMapCount: (map, key, initialValue = 1) =>
        map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
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
    updateMaxValueMap: (map, key, value) => map.set(key, value),
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
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
