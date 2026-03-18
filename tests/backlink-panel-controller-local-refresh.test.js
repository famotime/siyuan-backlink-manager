import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink panel controller exposes a document-group local refresh entry", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /function refreshBacklinkDocumentGroupById\(/);
  assert.match(source, /return \{[\s\S]*refreshBacklinkDocumentGroupById,[\s\S]*\};/);
});

test("backlink panel controller delegates editor registry and refresh tracking to extracted helpers", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createDocumentGroupRefreshTracker,[\s\S]*createEditorRegistry[\s\S]*\}\s*from "\.\/backlink-panel-controller-runtime\.js";/,
  );
  assert.match(source, /const editorRegistry = createEditorRegistry\(state\);/);
  assert.match(
    source,
    /const documentGroupRefreshTracker = createDocumentGroupRefreshTracker\(\s*\{[\s\S]*state,[\s\S]*refreshBacklinkDocumentGroupDataById,[\s\S]*\}\s*\);/,
  );
});

test("backlink panel controller delegates preview refresh and document-group rerender to an extracted coordinator", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPreviewRenderCoordinator[\s\S]*\}\s*from "\.\/backlink-panel-controller-rendering\.js";/,
  );
  assert.match(
    source,
    /const previewRenderCoordinator = createBacklinkPreviewRenderCoordinator\(\s*\{[\s\S]*state,[\s\S]*renderBacklinkDocumentGroup,[\s\S]*groupBacklinksByDocument,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /previewRenderCoordinator\.refreshBacklinkPreview\(\);/);
  assert.match(source, /previewRenderCoordinator\.refreshBacklinkDocumentGroupById\(/);
});

test("backlink panel controller delegates filter display refresh and render-data updates to an extracted data coordinator", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelDataCoordinator[\s\S]*\}\s*from "\.\/backlink-panel-controller-data\.js";/,
  );
  assert.match(
    source,
    /const panelDataCoordinator = createBacklinkPanelDataCoordinator\(\s*\{[\s\S]*state,[\s\S]*refreshBacklinkPreview,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /panelDataCoordinator\.refreshFilterDisplayData\(\);/);
  assert.match(source, /panelDataCoordinator\.updateRenderData\(\);/);
  assert.match(source, /panelDataCoordinator\.pageTurning\(pageNumParam\);/);
});

test("backlink panel controller delegates init/base-data orchestration to an extracted init coordinator", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelInitCoordinator[\s\S]*\}\s*from "\.\/backlink-panel-controller-init\.js";/,
  );
  assert.match(
    source,
    /const panelInitCoordinator = createBacklinkPanelInitCoordinator\(\s*\{[\s\S]*state,[\s\S]*clearBacklinkProtyleList,[\s\S]*updateRenderData,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /return panelInitCoordinator\.initBaseData\(\);/);
  assert.match(source, /return panelInitCoordinator\.clearCacheAndRefresh\(\);/);
});

test("backlink panel controller delegates navigation actions to an extracted navigation helper", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelNavigationActions[\s\S]*\}\s*from "\.\/backlink-panel-controller-navigation\.js";/,
  );
  assert.match(
    source,
    /const panelNavigationActions = createBacklinkPanelNavigationActions\(\s*\{[\s\S]*state,[\s\S]*refreshBacklinkDocumentGroupById,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /return panelNavigationActions\.navigateBacklinkDocument\(event, direction\);/);
  assert.match(
    source,
    /return panelNavigationActions\.stepBacklinkDocumentContext\(\s*documentLiElement,\s*direction,\s*\);/,
  );
});

test("backlink panel controller delegates bulk expand and collapse actions to an extracted bulk helper", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelBulkActions[\s\S]*\}\s*from "\.\/backlink-panel-controller-bulk\.js";/,
  );
  assert.match(
    source,
    /const panelBulkActions = createBacklinkPanelBulkActions\(\s*\{[\s\S]*state,[\s\S]*expandBacklinkDocument,[\s\S]*collapseBacklinkDocument,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /return panelBulkActions\.expandAllBacklinkDocument\(\);/);
  assert.match(source, /return panelBulkActions\.collapseAllBacklinkListItemNode\(\);/);
});

test("document-group local refresh rebuilds grouped backlinks from current render data and only rerenders the target document", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller-rendering.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /state\.backlinkDocumentGroupArray = groupBacklinksByDocument\(\s*state\.backlinkFilterPanelRenderData\.backlinkDocumentArray,\s*state\.backlinkFilterPanelRenderData\.backlinkDataArray,\s*state\.backlinkDocumentActiveIndexMap,\s*\);/,
  );
  assert.match(
    source,
    /const nextDocumentGroup = state\.backlinkDocumentGroupArray\.find\(\s*\(group\) => group\.documentId === documentId,\s*\);/,
  );
  assert.match(
    source,
    /renderBacklinkDocumentGroup\(\s*nextDocumentGroup,\s*(?:targetDocumentLiElement|documentLiElement),\s*(?:targetEditorElement|editorElement),\s*\);/,
  );
});

test("navigation and context stepping reuse the local refresh entry instead of duplicating rerender logic", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /refreshBacklinkDocumentGroupById\(documentId\);/);
  assert.match(
    source,
    /refreshBacklinkDocumentGroupById\(\s*documentId,\s*\{\s*documentLiElement,\s*editorElement,\s*\},\s*\);/,
  );
});

test("rendered backlink document editors attach focusout and drop handlers for local refresh", () => {
  const runtimeSource = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller-runtime.js", import.meta.url),
    "utf8",
  );

  assert.match(runtimeSource, /function attachBacklinkDocumentGroupRefreshTracking\(/);
  assert.match(runtimeSource, /contentElement\.addEventListener\("focusout", handleFocusOut\);/);
  assert.match(runtimeSource, /contentElement\.addEventListener\("drop", handleDrop\);/);
  assert.match(runtimeSource, /const focusBlockId = editor\?\.protyle\?\.block\?\.id \|\| state\.focusBlockId;/);
  assert.match(runtimeSource, /refreshBacklinkDocumentGroupDataById\(documentId,\s*\{\s*focusBlockId\s*\}\);/);
});

test("backlink document local refresh tracking is torn down before editor destruction", () => {
  const runtimeSource = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller-runtime.js", import.meta.url),
    "utf8",
  );
  const controllerSource = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(runtimeSource, /const detachDocumentGroupRefreshTrackingMap = new Map\(\);/);
  assert.match(runtimeSource, /detachDocumentGroupRefreshTrackingMap\.get\(documentId\)\?\.\(\);/);
  assert.match(runtimeSource, /detachDocumentGroupRefreshTrackingMap\.delete\(documentId\);/);
  assert.match(controllerSource, /detachAllDocumentGroupRefreshTracking\(\);/);
});

test("document-group data refresh recomputes render data before rerendering the target document", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  const localRefreshBlock =
    source.match(
      /async function refreshBacklinkDocumentGroupDataById\([\s\S]*?return refreshBacklinkDocumentGroupById\(documentId\);\n  }/,
    )?.[0] || "";

  assert.match(source, /async function refreshBacklinkDocumentGroupDataById\(\s*documentId,\s*\{\s*focusBlockId = null,\s*\}\s*=\s*\{\s*\},\s*\)/);
  assert.match(localRefreshBlock, /state\.focusBlockId = focusBlockId \|\| state\.focusBlockId;/);
  assert.match(localRefreshBlock, /await loadBacklinkPanelBaseData\(\);/);
  assert.match(
    localRefreshBlock,
    /state\.backlinkFilterPanelRenderData = await getBacklinkPanelRenderData\(\s*state\.backlinkFilterPanelBaseData,\s*state\.queryParams,\s*\);/,
  );
  assert.match(localRefreshBlock, /await refreshFilterDisplayData\(\);/);
  assert.match(localRefreshBlock, /return refreshBacklinkDocumentGroupById\(documentId\);/);
});

test("document-group data refresh does not reset context level or active index state", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  const localRefreshBlock =
    source.match(
      /async function refreshBacklinkDocumentGroupDataById\([\s\S]*?\n  }\n\n  function stepBacklinkDocumentContext/,
    )?.[0] || "";

  assert.doesNotMatch(localRefreshBlock, /backlinkDocumentActiveIndexMap\.clear\(/);
  assert.doesNotMatch(localRefreshBlock, /markBacklinkDocumentVisibilityLevel\(/);
  assert.doesNotMatch(localRefreshBlock, /markBacklinkDocumentFullView\(/);
});
