import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveDockMobileSidebarState,
  resolveDockResizeState,
  resolveDockSwitchProtyleRootId,
} from "../src/components/dock/backlink-dock-coordinator.js";

test("resolveDockSwitchProtyleRootId: 当侧面板已有展示文档时，切换文档保持原文档 rootId 不变", () => {
  const result = resolveDockSwitchProtyleRootId({
    currentRootId: "doc-original",
    incomingRootId: "doc-switched-target",
    dockActive: true,
  });

  assert.equal(
    result.nextRootId,
    "doc-original",
    "切换主文档时不应自动覆盖 Dock 已展示的文档 ID",
  );
  assert.equal(
    result.nextLastRootId,
    "doc-switched-target",
    "必须记录最新访问的文档 ID，供后续点击刷新按钮获取",
  );
});

test("resolveDockSwitchProtyleRootId: 当侧面板尚未初始化文档时，首次切换文档能够赋初值", () => {
  const result = resolveDockSwitchProtyleRootId({
    currentRootId: "",
    incomingRootId: "doc-first-opened",
    dockActive: true,
  });

  assert.equal(
    result.nextRootId,
    "doc-first-opened",
    "尚未有文档时首次激活应初始化 rootId",
  );
  assert.equal(result.nextLastRootId, "doc-first-opened");
});

test("resolveDockSwitchProtyleRootId: 当 Dock 未激活且当前无文档时，不主动初始化 rootId", () => {
  const result = resolveDockSwitchProtyleRootId({
    currentRootId: "",
    incomingRootId: "doc-hidden-event",
    dockActive: false,
  });

  assert.equal(result.nextRootId, "");
  assert.equal(result.nextLastRootId, "doc-hidden-event");
});

test("resolveDockResizeState: 侧栏展开时保持已展示文档，不因 resize 被新文档覆盖", () => {
  const result = resolveDockResizeState({
    currentRootId: "doc-pinned",
    clientWidth: 320,
    lastRootId: "doc-latest-switched",
    fallbackDocId: "doc-fallback",
  });

  assert.equal(result.dockActive, true);
  assert.equal(
    result.nextRootId,
    "doc-pinned",
    "侧栏 resize 时必须保持已有 rootId",
  );
});

test("resolveDockResizeState: 侧栏展开且无文档时使用最近文档赋初值", () => {
  const result = resolveDockResizeState({
    currentRootId: "",
    clientWidth: 300,
    lastRootId: "doc-recent",
    fallbackDocId: "doc-fallback",
  });

  assert.equal(result.dockActive, true);
  assert.equal(result.nextRootId, "doc-recent");
});

test("resolveDockResizeState: 侧栏折叠时置 dockActive 为 false 并保留 rootId", () => {
  const result = resolveDockResizeState({
    currentRootId: "doc-pinned",
    clientWidth: 0,
    lastRootId: "doc-latest",
  });

  assert.equal(result.dockActive, false);
  assert.equal(result.nextRootId, "doc-pinned");
});

test("resolveDockMobileSidebarState: 移动端抽屉展开时保留已有 rootId，无文档时初始化", () => {
  const preserved = resolveDockMobileSidebarState({
    currentRootId: "doc-mobile-pinned",
    hasTransform: true,
    lastRootId: "doc-mobile-new",
  });
  assert.equal(preserved.dockActive, true);
  assert.equal(preserved.nextRootId, "doc-mobile-pinned");

  const initialized = resolveDockMobileSidebarState({
    currentRootId: "",
    hasTransform: true,
    lastRootId: "doc-mobile-new",
  });
  assert.equal(initialized.dockActive, true);
  assert.equal(initialized.nextRootId, "doc-mobile-new");
});

test("backlink-filter-panel-dock.svelte: 引入调度协调器并使用 bind:rootId 双向绑定", () => {
  const source = readFileSync(
    new URL(
      "../src/components/dock/backlink-filter-panel-dock.svelte",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /resolveDockSwitchProtyleRootId/,
    "Dock 组件应调用 resolveDockSwitchProtyleRootId 协调文档切换",
  );
  assert.match(
    source,
    /bind:rootId/,
    "Dock 组件应使用 bind:rootId 以便与右上角刷新按钮的双向状态同步",
  );
  assert.match(
    source,
    /onDestroy\(/,
    "Dock 组件销毁时应清理事件监听",
  );
});
