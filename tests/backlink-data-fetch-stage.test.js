import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink data delegates backlink fetch and source-window attachment to a dedicated fetch stage helper", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-data.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*buildBacklinkFetchStageResult[\s\S]*\}\s*from "\.\/backlink-data-fetch-stage\.js";/,
  );
  assert.match(
    source,
    /const fetchStageResult = await buildBacklinkFetchStageResult\(\s*\{[\s\S]*rootId,[\s\S]*pageBacklinkBlockArray,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /const backlinkDataArray = fetchStageResult\.backlinkDataArray;/);
  assert.match(source, /const usedCache = fetchStageResult\.usedCache;/);
});
