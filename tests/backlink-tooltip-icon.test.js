import test from "node:test";
import assert from "node:assert/strict";

import { renderIcon } from "../src/utils/svg-icon.ts";
import {
  buildBacklinkTooltipClass,
  getBacklinkTooltipDirection,
  buildBacklinkProgressTooltip,
} from "../src/utils/tooltip.ts";
import {
  collapseBacklinkBreadcrumbItems,
  buildBacklinkBreadcrumbFullPath,
} from "../src/components/panel/backlink-document-row.js";

test("renderIcon 输出统一 bl-icon class 与 symbol 引用", () => {
  const html = renderIcon("iconBlRefresh");
  assert.match(html, /<svg class="bl-icon"/);
  assert.match(html, /width="var\(--bl-icon-size\)"/);
  assert.match(html, /<use xlink:href="#iconBlRefresh"><\/use>/);
  assert.match(html, /aria-hidden="true"/);
});

test("renderIcon 支持数字与自定义尺寸", () => {
  assert.match(renderIcon("iconBlSearch", 13), /width="13px"/);
  assert.match(renderIcon("iconBlSearch", "14px"), /width="14px"/);
});

test("tooltip 方向按宿主解析：dock 用 sw，宽场景用 s", () => {
  assert.equal(getBacklinkTooltipDirection("dock"), "sw");
  assert.equal(getBacklinkTooltipDirection("tab"), "s");
  assert.equal(getBacklinkTooltipDirection("bottom"), "s");
  assert.equal(getBacklinkTooltipDirection(), "sw");
  assert.equal(buildBacklinkTooltipClass("tab"), "b3-tooltips b3-tooltips__s");
  assert.equal(buildBacklinkTooltipClass("dock"), "b3-tooltips b3-tooltips__sw");
});

test("buildBacklinkProgressTooltip 解析分页进度为语义化文案", () => {
  assert.equal(buildBacklinkProgressTooltip("1/1"), "第 1 条 / 共 1 条反链");
  assert.equal(buildBacklinkProgressTooltip("2/3"), "第 2 条 / 共 3 条反链");
  assert.equal(buildBacklinkProgressTooltip(""), "");
  assert.equal(buildBacklinkProgressTooltip("无进度"), "");
});

test("collapseBacklinkBreadcrumbItems 不超过 3 级时原样返回", () => {
  const items = [
    { id: "a", label: "一级", clickable: true },
    { id: "b", label: "二级", clickable: true },
  ];
  assert.equal(collapseBacklinkBreadcrumbItems(items), items);
  assert.deepEqual(collapseBacklinkBreadcrumbItems(null), []);
});

test("collapseBacklinkBreadcrumbItems 超过 3 级折叠为首级 › … › 末级", () => {
  const items = [
    { id: "a", label: "一级", clickable: true },
    { id: "b", label: "二级", clickable: true },
    { id: "c", label: "三级", clickable: true },
    { id: "d", label: "四级", clickable: true },
  ];
  const collapsed = collapseBacklinkBreadcrumbItems(items);
  assert.equal(collapsed.length, 3);
  assert.equal(collapsed[0].id, "a");
  assert.equal(collapsed[1].label, "…");
  assert.equal(collapsed[1].clickable, false);
  assert.equal(collapsed[1].ellipsis, true);
  assert.equal(collapsed[2].id, "d");
});

test("buildBacklinkBreadcrumbFullPath 拼接完整路径", () => {
  const items = [
    { id: "a", label: "一级" },
    { id: "b", label: "二级" },
    { id: "c", label: "" },
    { id: "d", label: "末级" },
  ];
  assert.equal(buildBacklinkBreadcrumbFullPath(items), "一级 › 二级 › 末级");
  assert.equal(buildBacklinkBreadcrumbFullPath([]), "");
});
