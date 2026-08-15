import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeBacklinkContent,
  formatBacklinkDateTime,
} from "../src/service/backlink/backlink-content-sanitize.js";

test("sanitizeBacklinkContent 剥离 HTML 注释节点", () => {
  const input =
    '<div>正文<!-- network-lens-wiki-section:intro -->继续</div><!-- 跨行\n注释 -->结尾';
  const result = sanitizeBacklinkContent(input);
  assert.equal(result, "<div>正文继续</div>结尾");
  assert.ok(!result.includes("<!--"));
});

test("sanitizeBacklinkContent 压缩连续空行为一个空行", () => {
  const input = "第一段\n\n\n\n第二段\n \n \n第三段";
  const result = sanitizeBacklinkContent(input);
  assert.equal(result, "第一段\n\n第二段\n\n第三段");
});

test("sanitizeBacklinkContent 将内联 ISO 时间戳格式化为本地时间", () => {
  const input = "更新于 2026-05-10T05:30:36.345Z 完成";
  const result = sanitizeBacklinkContent(input);
  assert.ok(!result.includes("T05:30:36.345Z"));
  assert.match(result, /更新于 \d{4}-\d{2}-\d{2} \d{2}:\d{2} 完成/);
});

test("sanitizeBacklinkContent 空输入与非字符串输入返回空串", () => {
  assert.equal(sanitizeBacklinkContent(""), "");
  assert.equal(sanitizeBacklinkContent(null), "");
  assert.equal(sanitizeBacklinkContent(undefined), "");
});

test("sanitizeBacklinkContent 不破坏无注释无时间戳的普通内容", () => {
  const input = "<div data-node-id=\"abc\">普通段落</div>";
  assert.equal(sanitizeBacklinkContent(input), input);
});

test("formatBacklinkDateTime 输出本地 YYYY-MM-DD HH:mm 格式", () => {
  const result = formatBacklinkDateTime("2026-05-10T05:30:36.345Z");
  assert.match(result, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  // 本地时区换算后的值应与 Date 解析一致
  const date = new Date("2026-05-10T05:30:36.345Z");
  const pad = (value) => String(value).padStart(2, "0");
  const expected =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  assert.equal(result, expected);
});

test("formatBacklinkDateTime 省略秒与毫秒", () => {
  const result = formatBacklinkDateTime("2026-05-10T05:30:36.345Z");
  assert.ok(!result.includes(":36"));
});

test("formatBacklinkDateTime 无法解析时原样返回，空输入返回空串", () => {
  assert.equal(formatBacklinkDateTime("not-a-date"), "not-a-date");
  assert.equal(formatBacklinkDateTime(""), "");
  assert.equal(formatBacklinkDateTime(null), "");
});
