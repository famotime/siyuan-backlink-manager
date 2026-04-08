import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink results panel renders the global context control row beside the summary", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-results-panel.svelte", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /backlink-context-control-row backlink-context-control-row--global/,
  );
  assert.match(source, /stepAllBacklinkDocumentContextVisibilityLevel/);
  assert.match(source, /setAllBacklinkDocumentContextVisibilityLevel/);
  assert.match(source, /backlinkGlobalContextVisibilityLevel/);
});
