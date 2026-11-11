import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
