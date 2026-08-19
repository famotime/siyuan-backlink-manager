import test from "node:test";
import assert from "node:assert/strict";

import { CUSTOM_ICON_MAP } from "../src/models/icon-constant.ts";
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

test("CUSTOM_ICON_MAP 中 chevron 箭头 path 定义正确", () => {
  assert.match(CUSTOM_ICON_MAP.BlChevronLeft.source, /d="M15 18l-6-6 6-6"/);
  assert.match(CUSTOM_ICON_MAP.BlChevronRight.source, /d="M9 18l6-6-6-6"/);
  assert.match(CUSTOM_ICON_MAP.BlChevronUp.source, /d="M18 15l-6-6-6 6"/);
  assert.match(CUSTOM_ICON_MAP.BlChevronDown.source, /d="M6 9l6 6 6-6"/);
});

test("CUSTOM_ICON_MAP 中 BlRefresh, ResetInitialization, BlPanelLogo path 定义正确", () => {
  // 刷新图标采用双向旋转箭头
  assert.match(CUSTOM_ICON_MAP.BlRefresh.source, /d="M3 12a9 9 0 0 1 15-6.7L21 8"/);
  // 恢复默认图标采用新的重置设置/滑块图标
  assert.match(CUSTOM_ICON_MAP.ResetInitialization.source, /d="M13 15.75v-1.5h4v1.5zM14.5 21v-1.25H13v-1.5h1.5V17H16v4zm2.5-1.25v-1.5h4v1.5zM18 17v-4h1.5v1.25H21v1.5h-1.5V17zm2.775-7H18.7q-.65-2.2-2.475-3.6T12 5Q9.075 5 7.037 7.038T5 12q0 1.8.813 3.3T8 17.75V15h2v6H4v-2h2.35Q4.8 17.75 3.9 15.938T3 12q0-1.875.713-3.512t1.924-2.85t2.85-1.925T12 3q3.225 0 5.663 1.988T20.775 10"/);
  // 面板 Logo 与插件工具 Logo 一致
  assert.match(CUSTOM_ICON_MAP.BlPanelLogo.source, /d="M9 15H7a3 3 0 0 1 0-6h2"/);
  assert.match(CUSTOM_ICON_MAP.BacklinkPanelFilter.source, /d="M9 15H7a3 3 0 0 1 0-6h2"/);
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
