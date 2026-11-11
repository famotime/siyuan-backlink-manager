import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backlink context delegates meta creation and match reset helpers to extracted modules", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-context.js", import.meta.url),
    "utf8",
  );

  // 元信息构建由 backlink-context-meta.js 承担（getBacklinkContextMatchMeta 仅测试使用，
  // 已不再经 context.js 转发导出）
  assert.match(
    source,
    /import\s*\{[\s\S]*createBacklinkContextMetaInfo[\s\S]*\}\s*from "\.\/backlink-context-meta\.js";/,
  );
  assert.match(
    source,
    /import\s*\{[\s\S]*buildMatchSummary,[\s\S]*matchMetaInfoFields,[\s\S]*resetBacklinkContextMatches[\s\S]*\}\s*from "\.\/backlink-context-match\.js";/,
  );
});
