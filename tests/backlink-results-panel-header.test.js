import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink results panel renders document count summary in toolbar and global context control row in separate row", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-results-panel.svelte", import.meta.url),
    "utf8",
  );

  assert.match(source, /backlink-results-summary-text/);
  assert.match(source, /backlink-results-global-context-row/);
  assert.match(
    source,
    /backlink-context-control-row backlink-context-control-row--global/,
  );
  assert.match(source, /stepAllBacklinkDocumentContextVisibilityLevel/);
  assert.match(source, /setAllBacklinkDocumentContextVisibilityLevel/);
  assert.match(source, /backlinkGlobalContextVisibilityLevel/);
  assert.match(source, /showBacklinkProtyleBreadcrumb/);
  assert.match(source, /showReferencedTargetBlock/);
});

test("context state group keeps nowrap styles to prevent breaking into multiple lines", () => {
  const css = readFileSync(
    new URL("../src/components/panel/backlink-filter-panel-page.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.backlink-panel__area\s+\.backlink-context-state-group\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?white-space:\s*nowrap;[\s\S]*?\}/,
  );
  assert.match(
    css,
    /\.backlink-panel__area\s+\.backlink-context-control-row--global\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?\}/,
  );
});

