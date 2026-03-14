import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDefBlockAriaLabel,
  sanitizeBacklinkKeywords,
} from "../src/components/panel/backlink-panel-formatting.js";

test("removes include and exclude prefixes from backlink keywords before highlighting", () => {
  assert.deepEqual(
    sanitizeBacklinkKeywords(["%foo", "-bar", "%-baz", "-%qux", "plain"]),
    ["foo", "bar", "baz", "qux", "plain"],
  );
});

test("builds aria label from def block metadata and optional content", () => {
  const languages = {
    name: "名称",
    alias: "别名",
    anchor: "锚文本",
  };

  assert.equal(
    buildDefBlockAriaLabel(
      {
        name: "标题",
        alias: "别名A",
        staticAnchor: "锚点A",
        content: "正文内容",
      },
      languages,
      true,
    ),
    "名称: 标题<br>别名: 别名A<br>锚文本: 锚点A<br> 正文内容",
  );
});

test("returns an empty aria label for missing def blocks", () => {
  assert.equal(buildDefBlockAriaLabel(null, { name: "名称" }), "");
});
