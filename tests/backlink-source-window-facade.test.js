import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("source-window facade delegates planner strategies to an extracted planner module", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-source-window.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*buildCoreBacklinkSourceWindow,[\s\S]*buildExtendedBacklinkSourceWindow,[\s\S]*buildNearbyBacklinkSourceWindow[\s\S]*\}\s*from "\.\/backlink-source-window-planner\.js";/,
  );
});
