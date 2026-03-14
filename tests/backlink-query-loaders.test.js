import test from "node:test";
import assert from "node:assert/strict";

import {
  getBacklinkBlockArray,
  getHeadlineChildBlockArray,
  getListItemChildBlockArray,
  getParentBlockArray,
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
