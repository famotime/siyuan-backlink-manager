import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("source-window facade delegates window building to the extracted planner module", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-source-window.js", import.meta.url),
    "utf8",
  );

  // 门面仅暴露 buildBacklinkSourceWindow 与加载/SQL 两个入口；
  // 三档窗口策略（core/nearby/extended）由 planner 内部调度，不再经门面转发
  assert.match(
    source,
    /import\s*\{\s*buildBacklinkSourceWindow,?\s*\}\s*from "\.\/backlink-source-window-planner\.js";/,
  );
  assert.doesNotMatch(source, /__internal/);
});
