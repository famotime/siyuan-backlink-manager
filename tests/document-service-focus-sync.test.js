import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DocumentService forwards the current protyle focus block id into bottom panel refreshes", () => {
  const source = readFileSync(
    new URL("../src/service/plugin/DocumentService.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /let focusBlockId = getBacklinkPanelPageFocusBlockId\(e\.detail\.protyle\);/);
  assert.match(
    source,
    /await refreshBacklinkPanelToBottom\(docuemntContentElement, rootId, focusBlockId\);/,
  );
});

test("DocumentService updates existing bottom panel props when the root stays the same", () => {
  const source = readFileSync(
    new URL("../src/service/plugin/document-backlink-host-lifecycle.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /updatePanelProps\?\.\(\{/);
  assert.match(source, /focusBlockId,/);
});
