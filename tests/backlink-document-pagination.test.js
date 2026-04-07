import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkDocumentRenderState,
} from "../src/service/backlink/backlink-document-pagination.js";

test("builds a single render-state result with every filtered backlink block", () => {
  const backlinkBlockNodeArray = [
    { block: { id: "a-1", root_id: "doc-a" } },
    { block: { id: "a-2", root_id: "doc-a" } },
    { block: { id: "b-1", root_id: "doc-b" } },
    { block: { id: "c-1", root_id: "doc-c" } },
    { block: { id: "c-2", root_id: "doc-c" } },
  ];

  const renderState = buildBacklinkDocumentRenderState(backlinkBlockNodeArray);

  assert.equal(renderState.totalDocumentCount, 3);
  assert.equal(renderState.pageNum, 1);
  assert.equal(renderState.totalPage, 1);
  assert.deepEqual(
    renderState.pageBacklinkBlockArray.map((item) => item.block.id),
    ["a-1", "a-2", "b-1", "c-1", "c-2"],
  );
});

test("returns an empty render-state result when no backlink documents remain", () => {
  const backlinkBlockNodeArray = [
    { block: { id: "orphan", root_id: "" } },
  ];

  const renderState = buildBacklinkDocumentRenderState(backlinkBlockNodeArray);

  assert.deepEqual(renderState, {
    pageNum: 0,
    totalPage: 0,
    totalDocumentCount: 0,
    pageBacklinkBlockArray: [],
  });
});
