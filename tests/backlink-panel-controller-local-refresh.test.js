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

test("document-group local refresh rebuilds grouped backlinks from current render data and only rerenders the target document", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
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
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /function attachBacklinkDocumentGroupRefreshTracking\(/);
  assert.match(source, /contentElement\.addEventListener\("focusout", handleFocusOut\);/);
  assert.match(source, /contentElement\.addEventListener\("drop", handleDrop\);/);
  assert.match(source, /const focusBlockId = editor\?\.protyle\?\.block\?\.id \|\| state\.focusBlockId;/);
  assert.match(source, /refreshBacklinkDocumentGroupDataById\(documentId,\s*\{\s*focusBlockId,\s*\}\);/);
});

test("backlink document local refresh tracking is torn down before editor destruction", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /const detachDocumentGroupRefreshTrackingMap = new Map\(\);/);
  assert.match(source, /detachDocumentGroupRefreshTrackingMap\.get\(documentId\)\?\.\(\);/);
  assert.match(source, /detachDocumentGroupRefreshTrackingMap\.delete\(documentId\);/);
});

test("document-group data refresh recomputes render data before rerendering the target document", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  const localRefreshBlock =
    source.match(
      /async function refreshBacklinkDocumentGroupDataById\([\s\S]*?\n  }\n\n  function stepBacklinkDocumentContext/,
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
