import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("backlink panel controller forwards contextVisibilityLevel into protyle post-processing", () => {
  const source = fs.readFileSync(
    new URL("../src/components/panel/backlink-panel-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /applyCreatedBacklinkProtyleState:\s*\(\{\s*[\s\S]*?contextVisibilityLevel[\s\S]*?\}\)\s*=>[\s\S]*?applyCreatedBacklinkProtyleState\(\{[\s\S]*?contextVisibilityLevel,[\s\S]*?showFullDocument,/,
  );
});
