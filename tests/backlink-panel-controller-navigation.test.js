import test from "node:test";
import assert from "node:assert/strict";

import { createBacklinkPanelNavigationActions } from "../src/components/panel/backlink-panel-controller-navigation.js";

test("navigateBacklinkBreadcrumb expands the document and jumps within the current preview", () => {
  const calls = [];
  const editor = {
    protyle: {
      contentElement: {
        id: "content-element",
      },
    },
  };
  const documentLiElement = {
    getAttribute(name) {
      return name === "data-node-id" ? "doc-a" : null;
    },
    nextElementSibling: {
      querySelector() {
        return null;
      },
    },
  };
  const actions = createBacklinkPanelNavigationActions({
    state: {
      backlinkDocumentGroupArray: [],
      backlinkDocumentActiveIndexMap: new Map(),
      backlinkDocumentViewState: new Map(),
      backlinkDocumentEditorMap: new Map([["doc-a", editor]]),
    },
    getCyclicBacklinkIndex() {
      return 0;
    },
    isArrayEmpty(array) {
      return !Array.isArray(array) || array.length <= 0;
    },
    cycleBacklinkDocumentVisibilityLevel() {
      return "core";
    },
    markBacklinkDocumentVisibilityLevel() {},
    getBacklinkDocumentRenderState() {
      return { contextVisibilityLevel: "core" };
    },
    markBacklinkDocumentFullView() {},
    expandBacklinkDocument(documentLiElementArg) {
      calls.push(["expand", documentLiElementArg]);
    },
    refreshBacklinkDocumentGroupById() {},
    jumpToBreadcrumbBlockInPreview(protyleContentElement, blockId) {
      calls.push(["jump", protyleContentElement, blockId]);
      return true;
    },
  });

  const navigated = actions.navigateBacklinkBreadcrumb(documentLiElement, "heading-1");

  assert.equal(navigated, true);
  assert.deepEqual(calls, [
    ["expand", documentLiElement],
    ["jump", editor.protyle.contentElement, "heading-1"],
  ]);
});

test("navigateBacklinkBreadcrumb rerenders to the smallest level that contains the target block before jumping", () => {
  const calls = [];
  const currentEditor = {
    protyle: {
      contentElement: {
        id: "content-core",
      },
    },
  };
  const rerenderedEditor = {
    protyle: {
      contentElement: {
        id: "content-nearby",
      },
    },
  };
  const state = {
    backlinkDocumentGroupArray: [
      {
        documentId: "doc-a",
        activeBacklink: {
          backlinkBlock: {
            id: "block-a",
            root_id: "doc-a",
          },
          sourceWindows: {
            core: {
              windowBlockIds: ["block-a"],
              orderedVisibleBlockIds: ["block-a"],
            },
            nearby: {
              windowBlockIds: ["block-a", "heading-1"],
              orderedVisibleBlockIds: ["block-a", "heading-1"],
            },
          },
        },
      },
    ],
    backlinkDocumentActiveIndexMap: new Map(),
    backlinkDocumentViewState: {
      documentVisibilityLevelMap: new Map([["doc-a", "core"]]),
      documentShowFullMap: new Map(),
      documentFoldMap: new Map(),
    },
    backlinkDocumentEditorMap: new Map([["doc-a", currentEditor]]),
  };
  const documentLiElement = {
    getAttribute(name) {
      return name === "data-node-id" ? "doc-a" : null;
    },
    nextElementSibling: {
      id: "editor-host",
    },
  };
  const actions = createBacklinkPanelNavigationActions({
    state,
    getCyclicBacklinkIndex() {
      return 0;
    },
    isArrayEmpty(array) {
      return !Array.isArray(array) || array.length <= 0;
    },
    cycleBacklinkDocumentVisibilityLevel() {
      return "core";
    },
    markBacklinkDocumentVisibilityLevel(viewState, documentId, level) {
      calls.push(["mark-level", documentId, level]);
      viewState.documentVisibilityLevelMap.set(documentId, level);
    },
    getBacklinkDocumentRenderState(viewState, documentId) {
      return {
        contextVisibilityLevel:
          viewState.documentVisibilityLevelMap.get(documentId) || "core",
      };
    },
    markBacklinkDocumentFullView() {},
    expandBacklinkDocument(documentLiElementArg) {
      calls.push(["expand", documentLiElementArg]);
    },
    refreshBacklinkDocumentGroupById(documentId, payload) {
      calls.push(["refresh", documentId, payload.documentLiElement, payload.editorElement]);
      state.backlinkDocumentEditorMap.set(documentId, rerenderedEditor);
      return {};
    },
    jumpToBreadcrumbBlockInPreview(protyleContentElement, blockId) {
      calls.push(["jump", protyleContentElement.id, blockId]);
      return protyleContentElement.id === "content-nearby";
    },
    getBacklinkSourceWindowByLevel(activeBacklink, level) {
      return activeBacklink?.sourceWindows?.[level] || null;
    },
    getBacklinkSourceWindowOrderedVisibleBlockIds(sourceWindow) {
      return sourceWindow?.orderedVisibleBlockIds || [];
    },
  });

  const navigated = actions.navigateBacklinkBreadcrumb(documentLiElement, "heading-1");

  assert.equal(navigated, true);
  assert.deepEqual(calls, [
    ["expand", documentLiElement],
    ["jump", "content-core", "heading-1"],
    ["mark-level", "doc-a", "nearby"],
    ["refresh", "doc-a", documentLiElement, documentLiElement.nextElementSibling],
    ["jump", "content-nearby", "heading-1"],
  ]);
});
