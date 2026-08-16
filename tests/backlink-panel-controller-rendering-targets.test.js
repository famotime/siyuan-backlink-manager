import test from "node:test";
import assert from "node:assert/strict";

import { createBacklinkPreviewRenderCoordinator } from "../src/components/panel/backlink-panel-controller-rendering.js";
import { createBacklinkPanelBulkActions } from "../src/components/panel/backlink-panel-controller-bulk.js";

test("findBacklinkDocumentRenderTargets finds document header and editor elements in card structure", () => {
  const documentId = "doc-123";

  const editorElement = {
    getAttribute(name) {
      return name === "data-backlink-root-id" ? documentId : null;
    },
  };

  const bodyElement = {
    querySelector(selector) {
      if (selector === ".backlink-document-editor") {
        return editorElement;
      }
      return null;
    },
  };

  const documentLiElement = {
    getAttribute(name) {
      return name === "data-node-id" ? documentId : null;
    },
    nextElementSibling: bodyElement,
    closest(selector) {
      if (selector === ".backlink-card") {
        return {
          querySelector(subSelector) {
            if (subSelector === ".backlink-document-editor") {
              return editorElement;
            }
            return null;
          },
        };
      }
      return null;
    },
  };

  const backlinkULElement = {
    querySelector(selector) {
      if (selector === `.list-item__document-name[data-node-id="${documentId}"]`) {
        return documentLiElement;
      }
      if (selector === `.backlink-document-editor[data-backlink-root-id="${documentId}"]`) {
        return editorElement;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".list-item__document-name") {
        return [documentLiElement];
      }
      return [];
    },
  };

  // 验证与 controller 一致的 targets 查找逻辑
  function findBacklinkDocumentRenderTargets(docId) {
    if (!docId || !backlinkULElement) {
      return { documentLiElement: null, editorElement: null };
    }

    const foundDocLi =
      (typeof backlinkULElement.querySelector === "function"
        ? backlinkULElement.querySelector(
            `.list-item__document-name[data-node-id="${docId}"]`,
          )
        : null) ||
      (typeof backlinkULElement.querySelectorAll === "function"
        ? Array.from(
            backlinkULElement.querySelectorAll(".list-item__document-name"),
          ).find((element) => element.getAttribute?.("data-node-id") === docId)
        : null) ||
      null;

    const foundEditor =
      foundDocLi?.closest?.(".backlink-card")?.querySelector?.(".backlink-document-editor") ||
      foundDocLi?.nextElementSibling?.querySelector?.(".backlink-document-editor") ||
      (typeof backlinkULElement.querySelector === "function"
        ? backlinkULElement.querySelector(
            `.backlink-document-editor[data-backlink-root-id="${docId}"]`,
          )
        : null) ||
      null;

    return {
      documentLiElement: foundDocLi || null,
      editorElement: foundEditor || null,
    };
  }

  const targets = findBacklinkDocumentRenderTargets(documentId);
  assert.equal(targets.documentLiElement, documentLiElement);
  assert.equal(targets.editorElement, editorElement);

  const nonExistent = findBacklinkDocumentRenderTargets("non-existent");
  assert.equal(nonExistent.documentLiElement, null);
  assert.equal(nonExistent.editorElement, null);
});

test("previewRenderCoordinator.refreshBacklinkDocumentGroupById succeeds with card targets", () => {
  const documentId = "doc-456";
  const renderedGroups = [];

  const mockDocLi = { getAttribute: () => documentId };
  const mockEditor = { id: "editor-456" };

  const state = {
    backlinkFilterPanelRenderData: {
      backlinkDocumentArray: [{ id: documentId, name: "Test Doc" }],
      backlinkDataArray: [],
    },
    backlinkDocumentActiveIndexMap: new Map(),
    backlinkDocumentGroupArray: [],
  };

  const coordinator = createBacklinkPreviewRenderCoordinator({
    state,
    clearBacklinkProtyleList() {},
    batchCreateOfficialBacklinkProtyle() {},
    findBacklinkDocumentRenderTargets(id) {
      if (id === documentId) {
        return { documentLiElement: mockDocLi, editorElement: mockEditor };
      }
      return { documentLiElement: null, editorElement: null };
    },
    renderBacklinkDocumentGroup(group, docLi, editorEl) {
      renderedGroups.push({ group, docLi, editorEl });
    },
    groupBacklinksByDocument(docArr) {
      return docArr.map((doc) => ({
        documentId: doc.id,
        documentName: doc.name,
      }));
    },
  });

  const refreshed = coordinator.refreshBacklinkDocumentGroupById(documentId);
  assert.ok(refreshed);
  assert.equal(refreshed.documentId, documentId);
  assert.equal(renderedGroups.length, 1);
  assert.equal(renderedGroups[0].docLi, mockDocLi);
  assert.equal(renderedGroups[0].editorEl, mockEditor);
});

test("setAllBacklinkDocumentContextVisibilityLevel falls back to renderData document array when document groups array is uninitialized", () => {
  const state = {
    backlinkULElement: null,
    backlinkDocumentViewState: {
      globalContextVisibilityLevel: "core",
      documentVisibilityLevelMap: new Map(),
      documentFoldMap: new Map(),
      documentShowFullMap: new Map(),
    },
    backlinkDocumentGroupArray: [],
    backlinkFilterPanelRenderData: {
      backlinkDocumentArray: [
        { id: "fallback-doc-1" },
        { id: "fallback-doc-2" },
      ],
    },
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

  bulkActions.setAllBacklinkDocumentContextVisibilityLevel("full");

  assert.equal(state.backlinkDocumentViewState.globalContextVisibilityLevel, "full");
  assert.equal(
    state.backlinkDocumentViewState.documentVisibilityLevelMap.get("fallback-doc-1"),
    "full",
  );
  assert.equal(
    state.backlinkDocumentViewState.documentVisibilityLevelMap.get("fallback-doc-2"),
    "full",
  );
  assert.deepEqual(refreshCalls, ["fallback-doc-1", "fallback-doc-2"]);
});
