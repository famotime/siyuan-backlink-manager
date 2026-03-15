import test from "node:test";
import assert from "node:assert/strict";

import { mergeTurnPageBacklinkPanelRenderData } from "../src/components/panel/backlink-panel-render-data.js";

test("mergeTurnPageBacklinkPanelRenderData returns a new render data object with updated page fields", () => {
  const currentRenderData = {
    rootId: "doc-root",
    backlinkDataArray: [{ backlinkBlock: { id: "block-a" } }],
    backlinkDocumentArray: [{ id: "doc-a", content: "Alpha" }],
    backlinkBlockNodeArray: [{ block: { id: "node-a" } }],
    curDocDefBlockArray: [{ id: "def-a" }],
    relatedDefBlockArray: [{ id: "rel-a" }],
    backlinkDocumentCount: 3,
    pageNum: 1,
    pageSize: 20,
    totalPage: 3,
    usedCache: false,
  };
  const turnPageRenderData = {
    backlinkDataArray: [{ backlinkBlock: { id: "block-b" } }],
    pageNum: 2,
    pageSize: 20,
    totalPage: 3,
    usedCache: true,
  };

  const merged = mergeTurnPageBacklinkPanelRenderData(
    currentRenderData,
    turnPageRenderData,
  );

  assert.notEqual(merged, currentRenderData);
  assert.deepEqual(merged.backlinkDataArray, turnPageRenderData.backlinkDataArray);
  assert.equal(merged.pageNum, 2);
  assert.equal(merged.usedCache, true);
  assert.deepEqual(merged.backlinkDocumentArray, currentRenderData.backlinkDocumentArray);
  assert.deepEqual(merged.backlinkBlockNodeArray, currentRenderData.backlinkBlockNodeArray);
  assert.equal(currentRenderData.pageNum, 1);
  assert.deepEqual(currentRenderData.backlinkDataArray, [
    { backlinkBlock: { id: "block-a" } },
  ]);
});
