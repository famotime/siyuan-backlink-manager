import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink panel controller delegates query mutation and criteria actions to an extracted action helper", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkPanelActionHandlers[\s\S]*\}\s*from "\.\/backlink-panel-controller-actions\.js";/,
  );
  assert.match(
    source,
    /const panelActionHandlers = createBacklinkPanelActionHandlers\(\s*\{[\s\S]*state,[\s\S]*updateRenderData,[\s\S]*refreshFilterDisplayData,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /return panelActionHandlers\.resetFilterQueryParametersToDefault\(\);/);
  assert.match(source, /return panelActionHandlers\.handleBacklinkKeywordInput\(\);/);
});
