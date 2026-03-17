import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink sql keeps a dedicated focusBlockId branch for scoped document queries", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-sql.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(focusBlockId && focusBlockId != rootId\)/);
  assert.match(source, /WHERE id = '\$\{focusBlockId\}' AND root_id = '\$\{rootId\}'/);
});

test("getBacklinkPanelData keeps the incoming focusBlockId instead of clearing it immediately", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-data.ts", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("focusBlockId = null;"), false);
});
