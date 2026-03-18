import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("query loader module delegates child and sibling loader families to extracted modules", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-query-loaders.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*getHeadlineChildBlockArray,[\s\S]*getListItemChildBlockArray,[\s\S]*getParentBlockArray[\s\S]*\}\s*from "\.\/backlink-query-loader-children\.js";/,
  );
  assert.match(
    source,
    /import\s*\{[\s\S]*getSiblingBlockGroupArray[\s\S]*\}\s*from "\.\/backlink-query-loader-siblings\.js";/,
  );
});
