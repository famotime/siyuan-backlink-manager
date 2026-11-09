import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildBacklinkBreadcrumbItems,
  collapseBacklinkBreadcrumbItems,
  buildBacklinkBreadcrumbFullPath,
} from "../src/components/panel/backlink-breadcrumb.js";

test("buildBacklinkBreadcrumbItems keeps only the matched in-document heading path", () => {
  const breadcrumbItems = buildBacklinkBreadcrumbItems({
    backlinkBlock: {
      id: "target-block",
      root_id: "doc-a",
    },
    blockPaths: [
      {
        id: "doc-a",
        name: "Document A",
        type: "d",
        subType: "",
        children: [
          {
            id: "wrong-heading",
            name: "重复标题",
            type: "h",
            subType: "h2",
            children: [
              {
                id: "wrong-leaf",
                name: "错误节点",
                type: "p",
                subType: "",
                children: [],
              },
            ],
          },
          {
            id: "matched-heading",
            name: "重复标题",
            type: "h",
            subType: "h2",
            children: [
              {
                id: "list-shell",
                name: "列表项",
                type: "i",
                subType: "",
                children: [
                  {
                    id: "target-block",
                    name: "列表项",
                    type: "p",
                    subType: "",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    breadcrumbItems.map((item) => `${item.id}:${item.label}`),
    ["matched-heading:重复标题"],
  );
});

test("buildBacklinkBreadcrumbItems returns empty when the matched path contains no heading nodes", () => {
  const breadcrumbItems = buildBacklinkBreadcrumbItems({
    backlinkBlock: {
      id: "target-block",
      root_id: "doc-a",
    },
    blockPaths: [
      {
        id: "doc-a",
        name: "Document A",
        type: "d",
        subType: "",
        children: [
          {
            id: "list-shell",
            name: "列表项",
            type: "i",
            subType: "",
            children: [
              {
                id: "target-block",
                name: "正文段落",
                type: "p",
                subType: "",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(breadcrumbItems, []);
});

test("buildBacklinkBreadcrumbItems supports flat SiYuan blockPaths with NodeHeading items", () => {
  const breadcrumbItems = buildBacklinkBreadcrumbItems({
    backlinkBlock: {
      id: "target-paragraph",
      root_id: "doc-a",
    },
    blockPaths: [
      {
        id: "doc-a",
        name: "插件测试笔记本/主题笔记/~Skills/Claude Skills 不就是把提示词存个文件夹吗？ ***",
        type: "NodeDocument",
        subType: "",
        children: null,
      },
      {
        id: "heading-1",
        name: "二、Skills：让 Claude 真正「学会干活」",
        type: "NodeHeading",
        subType: "h2",
        children: null,
      },
      {
        id: "heading-2",
        name: "1. Skills 是什么？",
        type: "NodeHeading",
        subType: "h3",
        children: null,
      },
      {
        id: "target-paragraph",
        name: "",
        type: "NodeParagraph",
        subType: "",
        children: null,
      },
    ],
  });

  assert.deepEqual(
    breadcrumbItems.map((item) => `${item.id}:${item.label}`),
    [
      "heading-1:二、Skills：让 Claude 真正「学会干活」",
      "heading-2:1. Skills 是什么？",
    ],
  );
});

test("backlink breadcrumb module stays independent from the document row renderer", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-breadcrumb.js", import.meta.url),
    "utf8",
  );

  // 面包屑构建为纯数据/HTML 子域，不得反向依赖文档行渲染器（避免循环依赖）
  assert.doesNotMatch(source, /import\s*\{[^}]*\}\s*from\s*"[^"]*backlink-document-row/);
});
