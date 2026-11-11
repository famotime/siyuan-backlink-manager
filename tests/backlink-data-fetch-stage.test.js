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
    /const fetchStageResult = await buildBacklinkFetchStageResult\(\s*\{[\s\S]*rootId,[\s\S]*pageBacklinkBlockArray:\s*validBacklinkBlockNodeArray,[\s\S]*\}\s*\);/,
  );
  assert.match(source, /const backlinkDataArray = fetchStageResult\.backlinkDataArray;/);
  assert.match(source, /const usedCache = fetchStageResult\.usedCache;/);
});

test("backlink data wires the fetch stage dependencies exactly once for the render path", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-data.ts", import.meta.url),
    "utf8",
  );

  // 重构目标：deps 装配（getBatchBacklinkDoc / 源窗口加载 / 源窗口挂载）只允许出现一份
  assert.match(
    source,
    /function createBacklinkFetchStageDeps\(/,
    "backlink-data.ts 应定义共享的 fetch-stage deps 装配工厂",
  );
  for (const wiring of [
    "getBacklinkDocByApiOrCache:",
    "extractTargetBacklinkDom:",
    "triggerIncompleteBacklinkFetch:",
    "queryDocumentBlocksByRootIds:",
  ]) {
    const occurrences = source.split(wiring).length - 1;
    assert.equal(
      occurrences,
      1,
      `fetch-stage deps 装配中 ${wiring} 应只出现一次，实际 ${occurrences} 次`,
    );
  }

  // 渲染路径必须复用同一装配工厂，且装配只出现一份（翻页路径已随分页 UI 移除）
  const callSites = source.match(
    /deps:\s*createBacklinkFetchStageDeps\(rootId,\s*validBacklinkBlockNodeArray\)/g,
  );
  assert.ok(
    Array.isArray(callSites) && callSites.length === 1,
    "getBacklinkPanelRenderData 应复用 createBacklinkFetchStageDeps 且仅装配一次",
  );
});
