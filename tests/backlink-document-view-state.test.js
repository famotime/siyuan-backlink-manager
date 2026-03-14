import test from "node:test";
import assert from "node:assert/strict";

import {
  createBacklinkDocumentViewState,
  getBacklinkDocumentRenderState,
  markBacklinkDocumentExpanded,
  markBacklinkDocumentFoldState,
  markBacklinkDocumentFullView,
} from "../src/components/panel/backlink-document-view-state.js";

test("creates isolated maps for backlink document view state", () => {
  const state = createBacklinkDocumentViewState();

  assert.ok(state.documentFoldMap instanceof Map);
  assert.ok(state.documentShowFullMap instanceof Map);
  assert.ok(state.documentActiveIndexMap instanceof Map);
});

test("marking full view clears folded state for the document", () => {
  const state = createBacklinkDocumentViewState();
  markBacklinkDocumentFoldState(state.documentFoldMap, "doc-a", true);

  markBacklinkDocumentFullView(state, "doc-a");

  assert.equal(state.documentShowFullMap.get("doc-a"), true);
  assert.equal(state.documentFoldMap.has("doc-a"), false);
});

test("render state reflects folded and full-view flags", () => {
  const state = createBacklinkDocumentViewState();
  markBacklinkDocumentFoldState(state.documentFoldMap, "doc-a", true);
  state.documentActiveIndexMap.set("doc-a", 2);

  assert.deepEqual(getBacklinkDocumentRenderState(state, "doc-a"), {
    isFolded: true,
    showFullDocument: false,
    activeIndex: 2,
  });

  markBacklinkDocumentExpanded(state.documentFoldMap, "doc-a");
  markBacklinkDocumentFullView(state, "doc-a");

  assert.deepEqual(getBacklinkDocumentRenderState(state, "doc-a"), {
    isFolded: false,
    showFullDocument: true,
    activeIndex: 2,
  });
});
