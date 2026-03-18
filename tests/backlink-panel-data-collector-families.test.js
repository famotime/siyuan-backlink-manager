import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("panel data collectors delegate collector families to extracted core and context modules", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-panel-data-collectors.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*collectBacklinkBlocks,[\s\S]*collectHeadlineChildBlocks,[\s\S]*collectListItemTreeNodes[\s\S]*\}\s*from "\.\/backlink-panel-data-collector-core\.js";/,
  );
  assert.match(
    source,
    /import\s*\{[\s\S]*collectParentBlocks,[\s\S]*collectSiblingBlocks[\s\S]*\}\s*from "\.\/backlink-panel-data-collector-context\.js";/,
  );
});
