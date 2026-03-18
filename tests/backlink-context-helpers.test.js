import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink context delegates meta creation and match reset helpers to extracted modules", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-context.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkContextMetaInfo,[\s\S]*getBacklinkContextMatchMeta[\s\S]*\}\s*from "\.\/backlink-context-meta\.js";/,
  );
  assert.match(
    source,
    /import\s*\{[\s\S]*buildMatchSummary,[\s\S]*matchMetaInfoFields,[\s\S]*resetBacklinkContextMatches[\s\S]*\}\s*from "\.\/backlink-context-match\.js";/,
  );
});
