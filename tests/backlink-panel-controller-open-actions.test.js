import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink panel controller delegates document open actions to an extracted helper", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelOpenActions[\s\S]*\}\s*from "\.\/backlink-panel-controller-open-actions\.js";/,
  );
  assert.match(
    source,
    /const panelOpenActions = createBacklinkPanelOpenActions\(\s*\{[\s\S]*state,[\s\S]*openBlockTab,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /return panelOpenActions\.clickBacklinkDocumentLiElement\(event\);/);
  assert.match(source, /return panelOpenActions\.mouseDownBacklinkDocumentLiElement\(event\);/);
  assert.match(source, /return panelOpenActions\.contextmenuBacklinkDocumentLiElement\(event\);/);
});
