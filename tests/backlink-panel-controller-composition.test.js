import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
