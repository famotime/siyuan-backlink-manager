import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBacklinkPanelRenderBindings } from "../src/components/panel/backlink-panel-controller-composition.js";

test("backlink panel controller delegates render-dependency composition to an extracted helper", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelRenderBindings[\s\S]*\}\s*from "\.\/backlink-panel-controller-composition\.js";/,
  );
  assert.match(
    source,
    /const panelRenderBindings = createBacklinkPanelRenderBindings\(\s*\{[\s\S]*state,[\s\S]*renderBacklinkDocumentGroupByHelper,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /panelRenderBindings\.renderBacklinkDocumentGroup\(/);
  assert.match(source, /panelRenderBindings\.batchCreateOfficialBacklinkProtyle\(/);
});

test("backlink panel render bindings pass the local document-group renderer into batch rendering", () => {
  const state = {
    backlinkDocumentActiveIndexMap: new Map(),
    backlinkULElement: { append() {} },
    backlinkDocumentEditorMap: new Map(),
    backlinkDocumentViewState: new Map(),
    backlinkDocumentFoldMap: new Map(),
    backlinkProtyleItemFoldMap: new Map(),
    backlinkProtyleHeadingExpandMap: new Map(),
    queryParams: { backlinkKeywordStr: "" },
  };
  const batchCalls = [];

  const bindings = createBacklinkPanelRenderBindings({
    state,
    renderBacklinkDocumentGroupByHelper: () => null,
    updateBacklinkDocumentLiNavigation: () => {},
    getBacklinkContextControlState: () => ({ contextVisibilityLevel: "core" }),
    syncBacklinkDocumentProtyleState: () => {},
    captureBacklinkProtyleState: () => null,
    markBacklinkDocumentFoldState: () => {},
    removeEditor: () => {},
    ProtyleCtor: class {},
    app: {},
    buildBacklinkDocumentRenderOptions: () => ({}),
    getBacklinkDocumentRenderState: () => ({
      contextVisibilityLevel: "core",
      showFullDocument: false,
    }),
    applyCreatedBacklinkProtyleState: () => {},
    emitLoadedProtyleStatic: () => {},
    expandBacklinkDocument: () => {},
    collapseBacklinkDocument: () => {},
    expandAllListItemNode: () => {},
    expandBacklinkHeadingMore: () => {},
    foldListItemNodeByIdSet: () => {},
    defaultExpandedListItemLevel: 0,
    expandListItemNodeByDepth: () => {},
    getElementsBeforeDepth: () => [],
    getElementsAtDepth: () => [],
    syHasChildListNode: () => false,
    hideBlocksOutsideBacklinkSourceWindow: () => {},
    hideOtherListItemElement: () => {},
    isSetEmpty: () => true,
    isSetNotEmpty: () => false,
    isArrayNotEmpty: () => false,
    sanitizeBacklinkKeywords: () => [],
    splitKeywordStringToArray: () => [],
    highlightElementTextByCss: () => {},
    delayedTwiceRefresh: (callback) => callback(),
    addEditor: () => {},
    attachBacklinkDocumentGroupRefreshTracking: () => {},
    detachDocumentGroupRefreshTracking: () => {},
    groupBacklinksByDocument: () => [],
    batchRenderBacklinkDocumentGroups: (args) => {
      batchCalls.push(args);
      return [];
    },
    isArrayEmpty: () => true,
    documentRef: {
      createElement() {
        return {
          style: {},
          setAttribute() {},
        };
      },
    },
    emptyContentText: "empty",
    createBacklinkDocumentListItemElement: () => ({}),
    mouseDownBacklinkDocumentLiElement: () => {},
    clickBacklinkDocumentLiElement: () => {},
    contextmenuBacklinkDocumentLiElement: () => {},
    toggleBacklinkDocument: () => {},
    navigateBacklinkDocument: () => {},
    stepBacklinkDocumentContext: () => {},
  });

  bindings.batchCreateOfficialBacklinkProtyle([], []);

  assert.equal(batchCalls.length, 1);
  assert.equal(
    batchCalls[0].deps.renderDocumentGroup,
    bindings.renderBacklinkDocumentGroup,
  );
});
