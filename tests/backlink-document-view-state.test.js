import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceBacklinkDocumentVisibilityLevel,
  cycleBacklinkDocumentVisibilityLevel,
  createBacklinkDocumentViewState,
  getBacklinkDocumentRenderState,
  markBacklinkDocumentExpanded,
  markBacklinkDocumentFoldState,
  markBacklinkDocumentFullView,
  markBacklinkDocumentVisibilityLevel,
} from "../src/components/panel/backlink-document-view-state.js";

test("creates isolated maps for backlink document view state", () => {
  const state = createBacklinkDocumentViewState();

  assert.ok(state.documentFoldMap instanceof Map);
  assert.ok(state.documentShowFullMap instanceof Map);
  assert.ok(state.documentVisibilityLevelMap instanceof Map);
  assert.ok(state.documentActiveIndexMap instanceof Map);
});

test("advancing document visibility level stops at full", () => {
  const state = createBacklinkDocumentViewState();

  assert.equal(advanceBacklinkDocumentVisibilityLevel(state, "doc-a"), "nearby");
  assert.equal(advanceBacklinkDocumentVisibilityLevel(state, "doc-a"), "extended");
  assert.equal(advanceBacklinkDocumentVisibilityLevel(state, "doc-a"), "full");
  assert.equal(advanceBacklinkDocumentVisibilityLevel(state, "doc-a"), "full");

  assert.equal(state.documentVisibilityLevelMap.get("doc-a"), "full");
  assert.equal(state.documentShowFullMap.get("doc-a"), true);
});

test("cycling document visibility level stays bounded in both directions", () => {
  const state = createBacklinkDocumentViewState();

  assert.equal(
    cycleBacklinkDocumentVisibilityLevel(state, "doc-a", "previous"),
    "core",
  );
  assert.equal(
    cycleBacklinkDocumentVisibilityLevel(state, "doc-a", "next"),
    "nearby",
  );
  assert.equal(
    cycleBacklinkDocumentVisibilityLevel(state, "doc-a", "next"),
    "extended",
  );
  assert.equal(
    cycleBacklinkDocumentVisibilityLevel(state, "doc-a", "next"),
    "full",
  );
  assert.equal(
    cycleBacklinkDocumentVisibilityLevel(state, "doc-a", "next"),
    "full",
  );
  assert.equal(
    cycleBacklinkDocumentVisibilityLevel(state, "doc-a", "previous"),
    "extended",
  );
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
    contextVisibilityLevel: "core",
    showFullDocument: false,
    activeIndex: 2,
  });

  markBacklinkDocumentExpanded(state.documentFoldMap, "doc-a");
  markBacklinkDocumentVisibilityLevel(state, "doc-a", "extended");

  assert.deepEqual(getBacklinkDocumentRenderState(state, "doc-a"), {
    isFolded: false,
    contextVisibilityLevel: "extended",
    showFullDocument: false,
    activeIndex: 2,
  });

  markBacklinkDocumentFullView(state, "doc-a");

  assert.deepEqual(getBacklinkDocumentRenderState(state, "doc-a"), {
    isFolded: false,
    contextVisibilityLevel: "full",
    showFullDocument: true,
    activeIndex: 2,
  });
});
