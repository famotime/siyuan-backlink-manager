import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCreatedBacklinkProtyleState,
  batchRenderBacklinkDocumentGroups,
  renderBacklinkDocumentGroup,
  syncBacklinkDocumentProtyleState,
} from "../src/components/panel/backlink-protyle-rendering.js";

test("syncBacklinkDocumentProtyleState stores folded items and heading expansion", () => {
  const backlinkDocumentFoldMap = new Map();
  const backlinkProtyleItemFoldMap = new Map();
  const backlinkProtyleHeadingExpandMap = new Map();

  syncBacklinkDocumentProtyleState(
    { id: "editor-a" },
    {
      backlinkDocumentFoldMap,
      backlinkProtyleItemFoldMap,
      backlinkProtyleHeadingExpandMap,
      captureBacklinkProtyleState: () => ({
        backlinkBlockId: "block-a",
        backlinkRootId: "doc-a",
        isFolded: true,
        foldedItemIds: ["item-1", "item-2"],
        expandHeadingMore: true,
      }),
      markBacklinkDocumentFoldState: (map, key, value) => map.set(key, value),
    },
  );

  assert.equal(backlinkDocumentFoldMap.get("doc-a"), true);
  assert.deepEqual(
    Array.from(backlinkProtyleItemFoldMap.get("block-a").values()),
    ["item-1", "item-2"],
  );
  assert.equal(backlinkProtyleHeadingExpandMap.get("block-a"), true);
});

test("batchRenderBacklinkDocumentGroups renders empty content hint when there are no groups", () => {
  const appended = [];

  const groups = batchRenderBacklinkDocumentGroups({
    backlinkDocumentArray: [],
    backlinkDataArray: [],
    backlinkDocumentActiveIndexMap: new Map(),
    backlinkULElement: {
      append(node) {
        appended.push(node);
      },
    },
    deps: {
      groupBacklinksByDocument: () => [],
      isArrayEmpty: (array) => !array || array.length === 0,
      emptyContentText: "empty",
      documentRef: {
        createElement(tag) {
          return { tag, style: {}, innerText: "" };
        },
      },
      createDocumentListItemElement: () => null,
      renderDocumentGroup: () => {},
    },
  });

  assert.deepEqual(groups, []);
  assert.equal(appended[0].tag, "p");
  assert.equal(appended[0].innerText, "empty");
});

test("renderBacklinkDocumentGroup preserves folded items and heading expansion across rerenders", () => {
  const backlinkDocumentFoldMap = new Map();
  const backlinkProtyleItemFoldMap = new Map();
  const backlinkProtyleHeadingExpandMap = new Map();
  const removedEditors = [];
  const addedEditors = [];
  const applySnapshots = [];
  const existingEditor = {
    id: "editor-old",
    destroyCalled: false,
    destroy() {
      this.destroyCalled = true;
    },
  };
  const backlinkDocumentEditorMap = new Map([["doc-a", existingEditor]]);

  const editor = renderBacklinkDocumentGroup({
    documentGroup: {
      documentId: "doc-a",
      activeBacklink: {
        backlinkBlock: {
          id: "block-a",
          box: "box-a",
        },
      },
    },
    documentLiElement: {},
    editorElement: { innerHTML: "stale" },
    backlinkDocumentEditorMap,
    backlinkDocumentViewState: {},
    deps: {
      updateBacklinkDocumentLiNavigation: () => {},
      syncBacklinkDocumentProtyleState: (targetEditor) =>
        syncBacklinkDocumentProtyleState(targetEditor, {
          backlinkDocumentFoldMap,
          backlinkProtyleItemFoldMap,
          backlinkProtyleHeadingExpandMap,
          captureBacklinkProtyleState: () => ({
            backlinkBlockId: "block-a",
            backlinkRootId: "doc-a",
            isFolded: true,
            foldedItemIds: ["item-1", "item-2"],
            expandHeadingMore: true,
          }),
          markBacklinkDocumentFoldState: (map, key, value) => map.set(key, value),
        }),
      removeEditor: (targetEditor) => removedEditors.push(targetEditor.id),
      ProtyleCtor: class FakeProtyle {
        constructor(_app, _editorElement, _options) {
          this.protyle = {};
        }
      },
      app: {},
      buildBacklinkDocumentRenderOptions: () => ({}),
      getBacklinkDocumentRenderState: () => ({
        showFullDocument: false,
        contextVisibilityLevel: "nearby",
      }),
      applyCreatedBacklinkProtyleState: ({ backlinkData, protyle }) => {
        applySnapshots.push({
          backlinkId: backlinkData.backlinkBlock.id,
          foldIds: Array.from(backlinkProtyleItemFoldMap.get("block-a") || []),
          headingExpanded: backlinkProtyleHeadingExpandMap.get("block-a"),
          documentFolded: backlinkDocumentFoldMap.get("doc-a"),
          protyle,
        });
      },
      addEditor: (targetEditor) => addedEditors.push(targetEditor),
    },
  });

  assert.equal(existingEditor.destroyCalled, true);
  assert.deepEqual(removedEditors, ["editor-old"]);
  assert.equal(backlinkDocumentFoldMap.get("doc-a"), true);
  assert.deepEqual(Array.from(backlinkProtyleItemFoldMap.get("block-a").values()), [
    "item-1",
    "item-2",
  ]);
  assert.equal(backlinkProtyleHeadingExpandMap.get("block-a"), true);
  assert.deepEqual(applySnapshots.map((item) => ({
    backlinkId: item.backlinkId,
    foldIds: item.foldIds,
    headingExpanded: item.headingExpanded,
    documentFolded: item.documentFolded,
  })), [
    {
      backlinkId: "block-a",
      foldIds: ["item-1", "item-2"],
      headingExpanded: true,
      documentFolded: true,
    },
  ]);
  assert.equal(backlinkDocumentEditorMap.get("doc-a"), editor);
  assert.deepEqual(addedEditors, [editor]);
});

test("applyCreatedBacklinkProtyleState expands full document mode and skips item hiding", () => {
  const calls = [];
  const protyleContentElement = {
    addEventListener(type) {
      calls.push(type);
    },
  };

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: protyleContentElement,
      },
    },
    showFullDocument: true,
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      defaultExpandedListItemLevel: 2,
      expandListItemNodeByDepth: () => calls.push("expand-by-depth"),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      isSetEmpty: () => true,
      isSetNotEmpty: () => false,
      isArrayNotEmpty: () => false,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-document",
    "expand-all-items",
    "expand-heading",
    "highlight",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState expands one more local layer in nearby mode", () => {
  const calls = [];

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: {
          querySelector(selector) {
            return selector === "[data-node-id='block-a']" ? {} : null;
          },
          addEventListener(type) {
            calls.push(type);
          },
        },
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      isSetEmpty: () => true,
      isSetNotEmpty: () => false,
      isArrayNotEmpty: () => false,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth:2",
    "expand-heading",
    "hide-window",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState fully expands the local preview in extended mode", () => {
  const calls = [];

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: {
          querySelector(selector) {
            return selector === "[data-node-id='block-a']" ? {} : null;
          },
          addEventListener(type) {
            calls.push(type);
          },
        },
      },
    },
    contextVisibilityLevel: "extended",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      isSetEmpty: () => true,
      isSetNotEmpty: () => false,
      isArrayNotEmpty: () => false,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-all-items",
    "expand-heading",
    "hide-window",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState skips source window hiding when preview dom has no original backlink block id", () => {
  const calls = [];
  const protyleContentElement = {
    querySelector(selector) {
      if (selector === "[data-node-id='block-a']") {
        return null;
      }
      return null;
    },
    addEventListener(type) {
      calls.push(type);
    },
  };

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: protyleContentElement,
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      isSetEmpty: () => true,
      isSetNotEmpty: () => false,
      isArrayNotEmpty: () => false,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth:2",
    "expand-heading",
    "highlight",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState still applies nearby source window hiding when the folded list item anchor exists but the inner backlink block is not rendered yet", () => {
  const calls = [];
  const protyleContentElement = {
    querySelector(selector) {
      if (selector === "[data-node-id='block-a']") {
        return null;
      }
      if (selector === "[data-node-id='item-a']") {
        return {};
      }
      return null;
    },
    addEventListener(type) {
      calls.push(type);
    },
  };

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
      sourceWindows: {
        nearby: {
          anchorBlockId: "item-a",
          focusBlockId: "block-a",
          windowBlockIds: ["item-prev", "item-a", "block-a", "item-next"],
        },
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: protyleContentElement,
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      isSetEmpty: () => true,
      isSetNotEmpty: () => false,
      isArrayNotEmpty: () => false,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth:2",
    "expand-heading",
    "hide-window",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState applies source window hiding when only contextPlan bodyRange is available", () => {
  const calls = [];

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
      sourceWindows: {
        nearby: {
          focusBlockId: "block-a",
          anchorBlockId: "block-a",
          contextPlan: {
            bodyRange: {
              startBlockId: "block-a",
              endBlockId: "block-b",
              windowBlockIds: ["block-a", "block-b"],
            },
          },
        },
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: {
          querySelector(selector) {
            return selector === "[data-node-id='block-a']" ? {} : null;
          },
          addEventListener(type) {
            calls.push(type);
          },
        },
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 0,
      expandListItemNodeByDepth: () => calls.push("expand-by-depth"),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth",
    "expand-heading",
    "hide-window",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState still applies source window hiding when only contextPlan identity and bodyRange are available", () => {
  const calls = [];
  const protyleContentElement = {
    querySelector(selector) {
      if (selector === "[data-node-id='block-a']") {
        return null;
      }
      if (selector === "[data-node-id='item-a']") {
        return {};
      }
      return null;
    },
    addEventListener(type) {
      calls.push(type);
    },
  };

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
      sourceWindows: {
        nearby: {
          contextPlan: {
            identity: {
              anchorBlockId: "item-a",
              focusBlockId: "block-a",
            },
            bodyRange: {
              startBlockId: "item-prev",
              endBlockId: "item-next",
              windowBlockIds: ["item-prev", "item-a", "block-a", "item-next"],
            },
          },
        },
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: protyleContentElement,
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth:2",
    "expand-heading",
    "hide-window",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState retries source window hiding after the original backlink block appears", () => {
  const calls = [];
  let backlinkBlockVisible = false;
  const protyleContentElement = {
    querySelector(selector) {
      if (selector === "[data-node-id='block-a']") {
        return backlinkBlockVisible ? {} : null;
      }
      return null;
    },
    addEventListener(type) {
      calls.push(type);
    },
  };

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: protyleContentElement,
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "" },
      isSetEmpty: () => true,
      isSetNotEmpty: () => false,
      isArrayNotEmpty: () => false,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => {
        backlinkBlockVisible = true;
        callback();
      },
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth:2",
    "expand-heading",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});

test("applyCreatedBacklinkProtyleState skips related list filtering for nearby list item source windows", () => {
  const calls = [];

  applyCreatedBacklinkProtyleState({
    backlinkData: {
      backlinkBlock: {
        id: "block-a",
        root_id: "doc-a",
      },
      sourceWindows: {
        nearby: {
          anchorBlockId: "item-a",
          focusBlockId: "block-a",
        },
      },
    },
    documentLiElement: { id: "li-a" },
    protyle: {
      protyle: {
        contentElement: {
          querySelector(selector) {
            return selector === "[data-node-id='block-a']" ? {} : null;
          },
          addEventListener(type) {
            calls.push(type);
          },
        },
      },
    },
    contextVisibilityLevel: "nearby",
    deps: {
      emitLoadedProtyleStatic: () => calls.push("emit"),
      getBacklinkDocumentRenderState: () => ({ isFolded: false }),
      backlinkDocumentViewState: {},
      expandBacklinkDocument: () => calls.push("expand-document"),
      collapseBacklinkDocument: () => calls.push("collapse-document"),
      expandAllListItemNode: () => calls.push("expand-all-items"),
      expandBacklinkHeadingMore: () => calls.push("expand-heading"),
      backlinkProtyleItemFoldMap: new Map(),
      foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
      hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
      defaultExpandedListItemLevel: 1,
      expandListItemNodeByDepth: (_element, depth) =>
        calls.push(`expand-by-depth:${depth}`),
      getElementsBeforeDepth: () => [],
      getElementsAtDepth: () => [],
      syHasChildListNode: () => false,
      backlinkProtyleHeadingExpandMap: new Map(),
      hideOtherListItemElement: () => calls.push("hide-items"),
      queryParams: { backlinkKeywordStr: "", includeRelatedDefBlockIds: new Set(["def-a"]) },
      isSetEmpty: (set) => !set || set.size === 0,
      isSetNotEmpty: (set) => set && set.size > 0,
      isArrayNotEmpty: (array) => Array.isArray(array) && array.length > 0,
      sanitizeBacklinkKeywords: () => [],
      splitKeywordStringToArray: () => [],
      highlightElementTextByCss: () => calls.push("highlight"),
      delayedTwiceRefresh: (callback) => callback(),
    },
  });

  assert.deepEqual(calls, [
    "emit",
    "expand-by-depth:2",
    "expand-heading",
    "hide-window",
    "highlight",
    "hide-window",
    "highlight",
    "touchend",
  ]);
});
