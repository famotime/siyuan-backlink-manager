import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink panel controller uses the focus refresh strategy instead of unconditionally clearing document indexes", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /buildBacklinkPanelInitStrategy/);
  assert.match(source, /if \(initStrategy\.resetDocumentActiveIndexes\) \{\s*state\.backlinkDocumentActiveIndexMap\.clear\(\);/);
  assert.doesNotMatch(source, /clearBacklinkProtyleList\(\);\s*state\.backlinkDocumentActiveIndexMap\.clear\(\);/);
});

test("backlink panel controller reuses existing query params on same-root focus refreshes", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(!initStrategy\.reuseExistingQueryParams\) \{/);
  assert.match(source, /state\.queryParams = defaultPanelCriteria\.queryParams;/);
});

test("backlink panel controller refreshes the panel when main-editor focus changes inside the current root", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolveBacklinkPanelFocusRefresh/);
  assert.match(source, /const focusRefresh = resolveBacklinkPanelFocusRefresh\(\{/);
  assert.match(source, /if \(focusRefresh\.shouldRefresh\) \{\s*state\.focusBlockId = focusRefresh\.nextFocusBlockId;\s*initBaseData\(\);\s*\}/);
});
