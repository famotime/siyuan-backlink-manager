import test from "node:test";
import assert from "node:assert/strict";

import {
  filterBacklinkDocumentBlocks,
  filterExistingDefBlocks,
  sanitizeBacklinkRenderQueryParams,
} from "../src/service/backlink/backlink-filtering.js";

const DefinitionBlockStatus = {
  SELECTED: "SELECTED",
  EXCLUDED: "EXCLUDED",
  OPTIONAL: "OPTIONAL",
};

test("sanitizeBacklinkRenderQueryParams removes invalid ids and initializes missing sets", () => {
  const queryParams = {
    includeRelatedDefBlockIds: new Set(["keep-related", "drop-related"]),
    excludeRelatedDefBlockIds: null,
    includeDocumentIds: new Set(["keep-doc", "drop-doc"]),
    excludeDocumentIds: null,
  };
  const parentListItemTreeNode = {
    includeChildIdArray: ["a"],
    excludeChildIdArray: ["b"],
  };

  sanitizeBacklinkRenderQueryParams(queryParams, {
    curDocDefBlockArray: [{ id: "keep-related" }],
    relatedDefBlockArray: [],
    backlinkDocumentArray: [{ id: "keep-doc" }],
    backlinkBlockNodeArray: [{ parentListItemTreeNode }],
  });

  assert.deepEqual([...queryParams.includeRelatedDefBlockIds], ["keep-related"]);
  assert.deepEqual([...queryParams.includeDocumentIds], ["keep-doc"]);
  assert.ok(queryParams.excludeRelatedDefBlockIds instanceof Set);
  assert.ok(queryParams.excludeDocumentIds instanceof Set);
  assert.equal(parentListItemTreeNode.includeChildIdArray, null);
  assert.equal(parentListItemTreeNode.excludeChildIdArray, null);
});

test("filterExistingDefBlocks keeps referenced and explicitly selected blocks with counts", () => {
  const existingDefBlockArray = [
    { id: "ref-a", content: "A" },
    { id: "selected-b", content: "B" },
    { id: "excluded-c", content: "C" },
  ];
  const validBacklinkBlockNodeArray = [
    {
      includeRelatedDefBlockIds: new Set(["ref-a"]),
      includeCurBlockDefBlockIds: new Set(),
      includeParentDefBlockIds: new Set(),
      parentListItemTreeNode: null,
    },
    {
      includeRelatedDefBlockIds: new Set(["ref-a"]),
      includeCurBlockDefBlockIds: new Set(),
      includeParentDefBlockIds: new Set(),
      parentListItemTreeNode: null,
    },
  ];
  const queryParams = {
    includeRelatedDefBlockIds: new Set(["selected-b"]),
    excludeRelatedDefBlockIds: new Set(["excluded-c"]),
  };

  const result = filterExistingDefBlocks(
    existingDefBlockArray,
    validBacklinkBlockNodeArray,
    queryParams,
  );

  const byId = new Map(result.map((item) => [item.id, item]));
  assert.equal(byId.get("ref-a").refCount, 2);
  assert.equal(byId.get("ref-a").selectionStatus, DefinitionBlockStatus.OPTIONAL);
  assert.equal(byId.get("selected-b").selectionStatus, DefinitionBlockStatus.SELECTED);
  assert.equal(byId.get("excluded-c").selectionStatus, DefinitionBlockStatus.EXCLUDED);
});

test("filterExistingDefBlocks prefers contextBundle related ids when available", () => {
  const result = filterExistingDefBlocks(
    [{ id: "fragment-ref", content: "Fragment Ref" }],
    [
      {
        includeRelatedDefBlockIds: new Set(),
        includeCurBlockDefBlockIds: new Set(),
        includeParentDefBlockIds: new Set(),
        parentListItemTreeNode: null,
        contextBundle: {
          includeRelatedDefBlockIds: new Set(["fragment-ref"]),
        },
      },
    ],
    {
      includeRelatedDefBlockIds: new Set(),
      excludeRelatedDefBlockIds: new Set(),
    },
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "fragment-ref");
  assert.equal(result[0].refCount, 1);
});

test("filterBacklinkDocumentBlocks counts backlinks per document and preserves selected and excluded docs", () => {
  const existingDocBlockArray = [
    { id: "doc-a", content: "Doc A" },
    { id: "doc-b", content: "Doc B" },
    { id: "doc-c", content: "Doc C" },
  ];
  const validBacklinkBlockNodeArray = [
    { block: { root_id: "doc-a" } },
    { block: { root_id: "doc-a" } },
    { block: { root_id: "doc-b" } },
  ];
  const queryParams = {
    includeDocumentIds: new Set(["doc-c"]),
    excludeDocumentIds: new Set(["doc-b"]),
  };

  const result = filterBacklinkDocumentBlocks(
    existingDocBlockArray,
    validBacklinkBlockNodeArray,
    queryParams,
  );

  const byId = new Map(result.map((item) => [item.id, item]));
  assert.equal(byId.get("doc-a").refCount, 2);
  assert.equal(byId.get("doc-a").selectionStatus, DefinitionBlockStatus.OPTIONAL);
  assert.equal(byId.get("doc-b").selectionStatus, DefinitionBlockStatus.EXCLUDED);
  assert.equal(byId.get("doc-b").refCount, 0);
  assert.equal(byId.get("doc-c").selectionStatus, DefinitionBlockStatus.SELECTED);
});
