import test from "node:test";
import assert from "node:assert/strict";

import { createBacklinkPanelBulkActions } from "../src/components/panel/backlink-panel-controller-bulk.js";

test("setAllBacklinkDocumentContextVisibilityLevel updates all current documents without changing fold state", () => {
  const state = {
    backlinkULElement: {
      querySelectorAll() {
        return [];
      },
    },
    backlinkDocumentViewState: {
      globalContextVisibilityLevel: "core",
      documentVisibilityLevelMap: new Map(),
      documentFoldMap: new Map([["doc-a", true]]),
      documentShowFullMap: new Map(),
    },
    backlinkDocumentGroupArray: [
      { documentId: "doc-a" },
      { documentId: "doc-b" },
    ],
  };
  const refreshCalls = [];

  const bulkActions = createBacklinkPanelBulkActions({
    state,
    expandBacklinkDocument() {},
    collapseBacklinkDocument() {},
    expandAllListItemNode() {},
    collapseAllListItemNode() {},
    syHasChildListNode() {
      return false;
    },
    markBacklinkDocumentVisibilityLevel(viewState, documentId, level) {
      viewState.documentVisibilityLevelMap.set(documentId, level);
    },
    refreshBacklinkDocumentGroupById(documentId) {
      refreshCalls.push(documentId);
    },
  });

  bulkActions.setAllBacklinkDocumentContextVisibilityLevel("extended");

  assert.equal(state.backlinkDocumentViewState.globalContextVisibilityLevel, "extended");
  assert.equal(
    state.backlinkDocumentViewState.documentVisibilityLevelMap.get("doc-a"),
    "extended",
  );
  assert.equal(
    state.backlinkDocumentViewState.documentVisibilityLevelMap.get("doc-b"),
    "extended",
  );
  assert.equal(state.backlinkDocumentViewState.documentFoldMap.get("doc-a"), true);
  assert.equal(state.backlinkDocumentViewState.documentFoldMap.has("doc-b"), false);
  assert.deepEqual(refreshCalls, ["doc-a", "doc-b"]);
});
