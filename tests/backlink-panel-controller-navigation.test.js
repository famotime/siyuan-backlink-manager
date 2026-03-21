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
    ["mark-level", "doc-a", "nearby"],
    ["refresh", "doc-a", documentLiElement, documentLiElement.nextElementSibling],
    ["jump", "content-nearby", "heading-1"],
  ]);
});

test("navigateBacklinkBreadcrumb prefers the smallest level whose bodyRange keeps the heading-to-backlink range continuous", () => {
  const calls = [];
  const currentEditor = {
    protyle: {
      contentElement: {
        id: "content-core",
      },
    },
  };
  const extendedEditor = {
    protyle: {
      contentElement: {
        id: "content-extended",
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
              windowBlockIds: ["block-mid", "block-a"],
              orderedVisibleBlockIds: ["heading-1", "block-a"],
            },
            extended: {
              windowBlockIds: ["heading-1", "block-mid", "block-a"],
              orderedVisibleBlockIds: ["heading-1", "block-a"],
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
      const nextLevel =
        state.backlinkDocumentViewState.documentVisibilityLevelMap.get(documentId);
      calls.push(["refresh", documentId, nextLevel]);
      if (nextLevel === "extended") {
        state.backlinkDocumentEditorMap.set(documentId, extendedEditor);
      }
      return payload;
    },
    jumpToBreadcrumbBlockInPreview(protyleContentElement, blockId) {
      calls.push(["jump", protyleContentElement.id, blockId]);
      return protyleContentElement.id === "content-extended";
    },
    getBacklinkSourceWindowByLevel(activeBacklink, level) {
      return activeBacklink?.sourceWindows?.[level] || null;
    },
    getBacklinkSourceWindowOrderedVisibleBlockIds(sourceWindow) {
      return sourceWindow?.orderedVisibleBlockIds || [];
    },
    getBacklinkSourceWindowBodyRange(sourceWindow) {
      return {
        windowBlockIds: sourceWindow?.windowBlockIds || [],
      };
    },
  });

  const navigated = actions.navigateBacklinkBreadcrumb(documentLiElement, "heading-1");

  assert.equal(navigated, true);
  assert.deepEqual(calls, [
    ["expand", documentLiElement],
    ["mark-level", "doc-a", "extended"],
    ["refresh", "doc-a", "extended"],
    ["jump", "content-extended", "heading-1"],
  ]);
});

test("navigateBacklinkBreadcrumb rerenders when the current preview can locate the heading but still lacks a continuous bodyRange", () => {
  const calls = [];
  const currentEditor = {
    protyle: {
      contentElement: {
        id: "content-nearby",
      },
    },
  };
  const extendedEditor = {
    protyle: {
      contentElement: {
        id: "content-extended",
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
            nearby: {
              windowBlockIds: ["block-mid", "block-a"],
              orderedVisibleBlockIds: ["heading-1", "block-a"],
            },
            extended: {
              windowBlockIds: ["heading-1", "block-mid", "block-a"],
              orderedVisibleBlockIds: ["heading-1", "block-a"],
            },
          },
        },
      },
    ],
    backlinkDocumentActiveIndexMap: new Map(),
    backlinkDocumentViewState: {
      documentVisibilityLevelMap: new Map([["doc-a", "nearby"]]),
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
      return "nearby";
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
    refreshBacklinkDocumentGroupById(documentId) {
      const nextLevel =
        state.backlinkDocumentViewState.documentVisibilityLevelMap.get(documentId);
      calls.push(["refresh", documentId, nextLevel]);
      if (nextLevel === "extended") {
        state.backlinkDocumentEditorMap.set(documentId, extendedEditor);
      }
      return {};
    },
    jumpToBreadcrumbBlockInPreview(protyleContentElement, blockId) {
      calls.push(["jump", protyleContentElement.id, blockId]);
      return true;
    },
    getBacklinkSourceWindowByLevel(activeBacklink, level) {
      return activeBacklink?.sourceWindows?.[level] || null;
    },
    getBacklinkSourceWindowBodyRange(sourceWindow) {
      return {
        windowBlockIds: sourceWindow?.windowBlockIds || [],
      };
    },
  });

  const navigated = actions.navigateBacklinkBreadcrumb(documentLiElement, "heading-1");

  assert.equal(navigated, true);
  assert.deepEqual(calls, [
    ["expand", documentLiElement],
    ["mark-level", "doc-a", "extended"],
    ["refresh", "doc-a", "extended"],
    ["jump", "content-extended", "heading-1"],
  ]);
});
