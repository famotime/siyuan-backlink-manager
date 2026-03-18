import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DocumentService delegates bottom-panel host reuse and mount decisions to an extracted helper", () => {
  const source = readFileSync(
    new URL("../src/service/plugin/DocumentService.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*mountOrUpdateDocumentBottomBacklinkHost[\s\S]*\}\s*from "\.\/document-backlink-host-lifecycle\.js";/,
  );
  assert.match(
    source,
    /mountOrUpdateDocumentBottomBacklinkHost\(\s*\{[\s\S]*docuemntContentElement,[\s\S]*rootId,[\s\S]*focusBlockId,[\s\S]*\}\s*\);/,
  );
});
