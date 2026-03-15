import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCreatedBacklinkProtyleState,
  batchRenderBacklinkDocumentGroups,
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
    "hide-items",
    "highlight",
    "hide-items",
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
    "hide-items",
    "highlight",
    "hide-items",
    "highlight",
    "touchend",
  ]);
});
