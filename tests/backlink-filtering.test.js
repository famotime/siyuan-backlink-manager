import test from "node:test";
import assert from "node:assert/strict";

import {
  filterBacklinkDocumentBlocks,
  sanitizeBacklinkRenderQueryParams,
} from "../src/service/backlink/backlink-filtering.js";

const DefinitionBlockStatus = {
  SELECTED: "SELECTED",
  EXCLUDED: "EXCLUDED",
  OPTIONAL: "OPTIONAL",
};

test("sanitizeBacklinkRenderQueryParams removes invalid document ids and initializes missing sets", () => {
  const queryParams = {
    includeDocumentIds: new Set(["keep-doc", "drop-doc"]),
    excludeDocumentIds: null,
  };
  const parentListItemTreeNode = {
    includeChildIdArray: ["a"],
    excludeChildIdArray: ["b"],
  };

  sanitizeBacklinkRenderQueryParams(queryParams, {
    backlinkDocumentArray: [{ id: "keep-doc" }],
    backlinkBlockNodeArray: [{ parentListItemTreeNode }],
  });

  assert.deepEqual([...queryParams.includeDocumentIds], ["keep-doc"]);
  assert.ok(queryParams.excludeDocumentIds instanceof Set);
  assert.equal(parentListItemTreeNode.includeChildIdArray, null);
  assert.equal(parentListItemTreeNode.excludeChildIdArray, null);
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
