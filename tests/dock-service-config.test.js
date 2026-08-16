import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DockService 配置 Dock 初始位置在右上角（RightTop）以避免与其他面板共享右侧栏上下分割", () => {
  const source = readFileSync(
    new URL("../src/service/plugin/DockServices.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /position:\s*"RightTop"/,
    "DockService 必须配置 position 为 RightTop",
  );
  assert.doesNotMatch(
    source,
    /position:\s*"RightBottom"/,
    "DockService 不应使用 RightBottom",
  );
});
