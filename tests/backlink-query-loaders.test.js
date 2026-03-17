import test from "node:test";
import assert from "node:assert/strict";

import {
  getBacklinkBlockArray,
  getHeadlineChildBlockArray,
  getListItemChildBlockArray,
  getParentBlockArray,
  getSiblingBlockGroupArray,
} from "../src/service/backlink/backlink-query-loaders.js";

test("getBacklinkBlockArray chooses list-item SQL when list-item child queries are enabled", async () => {
  const sqlCalls = [];
  const result = await getBacklinkBlockArray(
    { querrChildDefBlockForListItem: true },
    {
      generateGetBacklinkListItemBlockArraySql: () => "LIST_SQL",
      generateGetBacklinkBlockArraySql: () => "BLOCK_SQL",
      sql: async (query) => {
        sqlCalls.push(query);
        return [{ id: "block-a" }];
      },
    },
  );

  assert.deepEqual(result, [{ id: "block-a" }]);
  assert.deepEqual(sqlCalls, ["LIST_SQL"]);
});

test("getHeadlineChildBlockArray keeps only nested child blocks", async () => {
  const result = await getHeadlineChildBlockArray(
    {
      queryChildDefBlockForHeadline: true,
      backlinkBlocks: [{ id: "headline-1", type: "h" }],
    },
    {
      generateGetHeadlineChildDefBlockArraySql: () => "HEADLINE_SQL",
      sql: async () => [
        { parentIdPath: "headline-1" },
        { parentIdPath: "headline-1->child-1" },
      ],
      isArrayEmpty: (value) => !value || value.length === 0,
    },
  );

  assert.deepEqual(result, [{ parentIdPath: "headline-1->child-1" }]);
});

test("getListItemChildBlockArray enriches list items with sub-markdown data", async () => {
  const result = await getListItemChildBlockArray(
    {
      querrChildDefBlockForListItem: true,
      backlinkBlocks: [{ parentBlockType: "i", parent_id: "list-root" }],
    },
    {
      generateGetListItemChildBlockArraySql: () => "LIST_CHILD_SQL",
      generateGetListItemtSubMarkdownArraySql: () => "SUB_MARKDOWN_SQL",
      sql: async (query) => {
        if (query === "LIST_CHILD_SQL") {
          return [{ id: "list-root", type: "i" }];
        }
        return [
          {
            parent_id: "list-root",
            parentInAttrConcat: " parent-attr",
            subMarkdown: "sub content",
            subInAttrConcat: " sub-attr",
          },
        ];
      },
      isSetEmpty: (value) => !value || value.size === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.deepEqual(result, [
    {
      id: "list-root",
      type: "i",
      parentInAttrConcat: " parent-attr",
      subMarkdown: "sub content",
      subInAttrConcat: " sub-attr",
    },
  ]);
});

test("getParentBlockArray enriches deep list parents with sub-markdown", async () => {
  const result = await getParentBlockArray(
    { queryParentDefBlock: true },
    {
      generateGetParentDefBlockArraySql: () => "PARENT_SQL",
      generateGetParenListItemtDefBlockArraySql: () => "PARENT_SUB_SQL",
      sql: async (query) => {
        if (query === "PARENT_SQL") {
          return [{ id: "parent-a", type: "i", childIdPath: "a->b->c->d" }];
        }
        return [{ parent_id: "parent-a", subMarkdown: "sub", inAttrConcat: " attr" }];
      },
      countOccurrences: (value, sub) => value.split(sub).length - 1,
      isSetNotEmpty: (value) => value && value.size > 0,
    },
  );

  assert.deepEqual(result, [
    {
      id: "parent-a",
      type: "i",
      childIdPath: "a->b->c->d",
      subMarkdown: "sub attr",
    },
  ]);
});

test("getSiblingBlockGroupArray groups immediate previous and next siblings by parent block", async () => {
  const result = await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [
        { id: "block-b", parent_id: "parent-1" },
        { id: "block-e", parent_id: "parent-2" },
      ],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: () => "SIBLING_SQL",
      sql: async () => [
        { id: "block-e", parent_id: "parent-2", sort: 20, path: "/e" },
        { id: "block-b", parent_id: "parent-1", sort: 20, path: "/b" },
        { id: "block-c", parent_id: "parent-1", sort: 30, path: "/c" },
        { id: "block-d", parent_id: "parent-2", sort: 10, path: "/d" },
        { id: "block-a", parent_id: "parent-1", sort: 10, path: "/a" },
      ],
      isArrayEmpty: (value) => !value || value.length === 0,
    },
  );

  assert.deepEqual(result, [
    {
      backlinkBlockId: "block-b",
      currentSiblingBlock: { id: "block-b", parent_id: "parent-1", sort: 20, path: "/b" },
      previousSiblingBlock: { id: "block-a", parent_id: "parent-1", sort: 10, path: "/a" },
      nextSiblingBlock: { id: "block-c", parent_id: "parent-1", sort: 30, path: "/c" },
      beforeSiblingBlocks: [],
      afterSiblingBlocks: [],
      expandedSiblingBlocks: [],
    },
    {
      backlinkBlockId: "block-e",
      currentSiblingBlock: { id: "block-e", parent_id: "parent-2", sort: 20, path: "/e" },
      previousSiblingBlock: { id: "block-d", parent_id: "parent-2", sort: 10, path: "/d" },
      nextSiblingBlock: null,
      beforeSiblingBlocks: [],
      afterSiblingBlocks: [],
      expandedSiblingBlocks: [],
    },
  ]);
});

test("getSiblingBlockGroupArray keeps ordinary block neighbors in the actual parent order when sorts are identical", async () => {
  const result = await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [{ id: "block-focus", parent_id: "doc-a" }],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: () => "SIBLING_SQL",
      sql: async () => [
        { id: "block-tail", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-intro", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-focus", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-meta", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
      ],
      getChildBlocks: async () => [
        { id: "block-intro" },
        { id: "block-focus" },
        { id: "block-meta" },
        { id: "block-tail" },
      ],
      isArrayEmpty: (value) => !value || value.length === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.deepEqual(result, [
    {
      backlinkBlockId: "block-focus",
      currentSiblingBlock: {
        id: "block-focus",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      previousSiblingBlock: {
        id: "block-intro",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      nextSiblingBlock: {
        id: "block-meta",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      beforeSiblingBlocks: [],
      afterSiblingBlocks: [{ id: "block-tail", parent_id: "doc-a", sort: 10, path: "/same", type: "p" }],
      expandedSiblingBlocks: [{ id: "block-tail", parent_id: "doc-a", sort: 10, path: "/same", type: "p" }],
    },
  ]);
});

test("getSiblingBlockGroupArray keeps original query order when sibling metadata ties and parent order is unavailable", async () => {
  const result = await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [{ id: "block-focus", parent_id: "doc-a" }],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: () => "SIBLING_SQL",
      sql: async () => [
        { id: "block-tail", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-focus", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-intro", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
      ],
      isArrayEmpty: (value) => !value || value.length === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.deepEqual(result, [
    {
      backlinkBlockId: "block-focus",
      currentSiblingBlock: {
        id: "block-focus",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      previousSiblingBlock: {
        id: "block-tail",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      nextSiblingBlock: {
        id: "block-intro",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      beforeSiblingBlocks: [],
      afterSiblingBlocks: [],
      expandedSiblingBlocks: [],
    },
  ]);
});

test("getSiblingBlockGroupArray keeps original relative order when parent child order is only partially known", async () => {
  const result = await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [{ id: "block-focus", parent_id: "doc-a" }],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: () => "SIBLING_SQL",
      sql: async () => [
        { id: "block-tail", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-focus", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
        { id: "block-intro", parent_id: "doc-a", sort: 10, path: "/same", type: "p" },
      ],
      getChildBlocks: async () => [
        { id: "block-focus" },
        { id: "block-intro" },
      ],
      isArrayEmpty: (value) => !value || value.length === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.deepEqual(result, [
    {
      backlinkBlockId: "block-focus",
      currentSiblingBlock: {
        id: "block-focus",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      previousSiblingBlock: {
        id: "block-tail",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      nextSiblingBlock: {
        id: "block-intro",
        parent_id: "doc-a",
        sort: 10,
        path: "/same",
        type: "p",
      },
      beforeSiblingBlocks: [],
      afterSiblingBlocks: [],
      expandedSiblingBlocks: [],
    },
  ]);
});

test("getSiblingBlockGroupArray uses sibling list items when backlink block is inside a list item", async () => {
  const result = await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [
        {
          id: "block-b",
          type: "p",
          parent_id: "item-b",
          parentBlockType: "i",
          parentListItemParentId: "list-root",
        },
      ],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: () => "SIBLING_SQL",
      generateGetListItemtSubMarkdownArraySql: () => "SUB_MARKDOWN_SQL",
      sql: async (query) => {
        if (query === "SIBLING_SQL") {
          return [
            { id: "item-c", type: "i", parent_id: "list-root", sort: 30, path: "/c" },
            { id: "item-a", type: "i", parent_id: "list-root", sort: 10, path: "/a" },
            { id: "item-b", type: "i", parent_id: "list-root", sort: 20, path: "/b" },
          ];
        }
        return [
          { parent_id: "item-a", subMarkdown: "prev item", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-b", subMarkdown: "current item", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-c", subMarkdown: "next item", subInAttrConcat: "", parentInAttrConcat: "" },
        ];
      },
      getBlockKramdown: async (id) => ({ id, kramdown: `* ${id} kramdown` }),
      isArrayEmpty: (value) => !value || value.length === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.deepEqual(result, [
    {
      backlinkBlockId: "block-b",
      currentSiblingBlock: {
        id: "item-b",
        type: "i",
        parent_id: "list-root",
        sort: 20,
        path: "/b",
        parentInAttrConcat: "",
        subMarkdown: "current item",
        subInAttrConcat: "",
        renderMarkdown: "* item-b kramdown",
      },
      previousSiblingBlock: {
        id: "item-a",
        type: "i",
        parent_id: "list-root",
        sort: 10,
        path: "/a",
        parentInAttrConcat: "",
        subMarkdown: "prev item",
        subInAttrConcat: "",
        renderMarkdown: "* item-a kramdown",
      },
      nextSiblingBlock: {
        id: "item-c",
        type: "i",
        parent_id: "list-root",
        sort: 30,
        path: "/c",
        parentInAttrConcat: "",
        subMarkdown: "next item",
        subInAttrConcat: "",
        renderMarkdown: "* item-c kramdown",
      },
      beforeSiblingBlocks: [],
      afterSiblingBlocks: [],
      expandedSiblingBlocks: [],
    },
  ]);
});

test("getSiblingBlockGroupArray queries list item sibling containers instead of the current list item id", async () => {
  const sqlCalls = [];

  await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [
        {
          id: "block-b",
          type: "p",
          parent_id: "item-b",
          parentBlockType: "i",
          parentListItemParentId: "list-root",
        },
      ],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: (queryParams) => {
        const parentIds = queryParams.backlinkBlocks.map((block) =>
          block.parentBlockType === "i" ? block.parentListItemParentId : block.parent_id,
        );
        return parentIds.join(",");
      },
      generateGetListItemtSubMarkdownArraySql: () => "",
      sql: async (query) => {
        sqlCalls.push(query);
        return [];
      },
      isArrayEmpty: (value) => !value || value.length === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.deepEqual(sqlCalls, ["list-root"]);
});

test("getSiblingBlockGroupArray keeps list item neighbors in the actual parent list order when sorts are identical", async () => {
  const result = await getSiblingBlockGroupArray(
    {
      backlinkBlocks: [
        {
          id: "block-brand",
          type: "p",
          parent_id: "item-brand",
          parentBlockType: "i",
          parentListItemParentId: "list-root",
        },
      ],
    },
    {
      generateGetBacklinkSiblingBlockArraySql: () => "SIBLING_SQL",
      generateGetListItemtSubMarkdownArraySql: () => "SUB_MARKDOWN_SQL",
      sql: async (query) => {
        if (query === "SIBLING_SQL") {
          return [
            { id: "item-expand", type: "i", parent_id: "list-root", sort: 20, path: "/same" },
            { id: "item-nearby", type: "i", parent_id: "list-root", sort: 20, path: "/same" },
            { id: "item-title", type: "i", parent_id: "list-root", sort: 20, path: "/same" },
            { id: "item-logo", type: "i", parent_id: "list-root", sort: 20, path: "/same" },
            { id: "item-error", type: "i", parent_id: "list-root", sort: 20, path: "/same" },
            { id: "item-brand", type: "i", parent_id: "list-root", sort: 20, path: "/same" },
          ];
        }
        return [
          { parent_id: "item-expand", subMarkdown: "扩展", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-nearby", subMarkdown: "近邻", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-brand", subMarkdown: "品牌主色", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-title", subMarkdown: "标题字体", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-logo", subMarkdown: "LOGO", subInAttrConcat: "", parentInAttrConcat: "" },
          { parent_id: "item-error", subMarkdown: "低级错误", subInAttrConcat: "", parentInAttrConcat: "" },
        ];
      },
      getBlockKramdown: async (id) => ({ id, kramdown: `* ${id}` }),
      getChildBlocks: async () => [
        { id: "item-expand" },
        { id: "item-nearby" },
        { id: "item-brand" },
        { id: "item-title" },
        { id: "item-logo" },
        { id: "item-error" },
      ],
      isArrayEmpty: (value) => !value || value.length === 0,
      isStrNotBlank: (value) => value !== "",
    },
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].previousSiblingBlock.id, "item-nearby");
  assert.equal(result[0].nextSiblingBlock.id, "item-title");
});
