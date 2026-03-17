import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkPreviewBacklinkData,
  selectBacklinkPreviewFragments,
} from "../src/service/backlink/backlink-preview-assembly.js";

function createActiveBacklink({
  contextVisibilityLevel = "nearby",
  explanationFragments = undefined,
  visibleFragments = [],
  previewSequence = undefined,
} = {}) {
  return {
    blockPaths: [{ id: "doc-a", name: "Doc A", type: "d", subType: "", children: [] }],
    dom: "<div data-node-id=\"block-self\">legacy</div>",
    expand: true,
    backlinkBlock: {
      id: "block-self",
      root_id: "doc-a",
      box: "box-a",
    },
    contextBundle: {
      explanationFragments,
      visibleFragments,
      contextVisibilityLevel,
      previewSequence,
    },
  };
}

test("selectBacklinkPreviewFragments keeps nearby preview focused on previous, self, and next blocks", () => {
  const fragments = selectBacklinkPreviewFragments({
    contextVisibilityLevel: "nearby",
    contextBundle: {
      visibleFragments: [
        { sourceType: "self", text: "self" },
        { sourceType: "parent", text: "parent" },
        { sourceType: "sibling_prev", text: "prev" },
        { sourceType: "child_headline", text: "child" },
        { sourceType: "sibling_next", text: "next" },
      ],
    },
  });

  assert.deepEqual(
    fragments.map((fragment) => fragment.sourceType),
    ["sibling_prev", "self", "sibling_next"],
  );
});

test("selectBacklinkPreviewFragments derives nearby fragments from bundle.fragments when visibleFragments are still core-only", () => {
  const fragments = selectBacklinkPreviewFragments({
    contextVisibilityLevel: "nearby",
    contextBundle: {
      fragments: [
        { sourceType: "self", text: "self", visibilityLevel: "core" },
        { sourceType: "document", text: "doc", visibilityLevel: "core" },
        { sourceType: "sibling_prev", text: "prev", visibilityLevel: "nearby" },
        { sourceType: "sibling_next", text: "next", visibilityLevel: "nearby" },
      ],
      visibleFragments: [
        { sourceType: "self", text: "self", visibilityLevel: "core" },
        { sourceType: "document", text: "doc", visibilityLevel: "core" },
      ],
    },
  });

  assert.deepEqual(
    fragments.map((fragment) => fragment.sourceType),
    ["sibling_prev", "self", "sibling_next"],
  );
});

test("selectBacklinkPreviewFragments adds parent and child context in extended mode", () => {
  const fragments = selectBacklinkPreviewFragments({
    contextVisibilityLevel: "extended",
    contextBundle: {
      visibleFragments: [
        { sourceType: "self", text: "self" },
        { sourceType: "sibling_prev", text: "prev" },
        { sourceType: "parent", text: "parent" },
        { sourceType: "child_headline", text: "headline child" },
        { sourceType: "child_list", text: "list child" },
        { sourceType: "sibling_next", text: "next" },
        { sourceType: "expanded", text: "expanded" },
      ],
    },
  });

  assert.deepEqual(
    fragments.map((fragment) => fragment.sourceType),
    [
      "parent",
      "sibling_prev",
      "self",
      "sibling_next",
      "child_headline",
      "child_list",
      "expanded",
    ],
  );
});

test("selectBacklinkPreviewFragments prefers explanationFragments over legacy visibleFragments", () => {
  const fragments = selectBacklinkPreviewFragments({
    contextVisibilityLevel: "nearby",
    contextBundle: {
      explanationFragments: [
        { sourceType: "self", text: "self", visibilityLevel: "core" },
        { sourceType: "parent", text: "parent", visibilityLevel: "nearby" },
      ],
      visibleFragments: [
        { sourceType: "self", text: "self", visibilityLevel: "core" },
        { sourceType: "sibling_prev", text: "prev", visibilityLevel: "nearby" },
      ],
    },
  });

  assert.deepEqual(
    fragments.map((fragment) => fragment.sourceType),
    ["self"],
  );
});

test("buildBacklinkPreviewBacklinkData assembles nearby preview around the current backlink block", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      previewSequence: {
        nearby: [
          { sequenceRole: "sibling_prev", sourceType: "sibling_prev", renderMarkdown: "Previous paragraph" },
          { sequenceRole: "self", sourceType: "self", renderMarkdown: "Self paragraph" },
          { sequenceRole: "sibling_next", sourceType: "sibling_next", renderMarkdown: "Next paragraph" },
        ],
      },
      visibleFragments: [
        { sourceType: "self", text: "Self paragraph" },
        { sourceType: "sibling_prev", text: "Previous paragraph" },
        { sourceType: "sibling_next", text: "Next paragraph" },
      ],
    }),
    contextVisibilityLevel: "nearby",
    deps: {
      markdownToBlockDOM: (markdown) => `<article>${markdown}</article>`,
    },
  });

  assert.equal(backlinkData.length, 1);
  assert.equal(
    backlinkData[0].dom.includes("Previous paragraph\n\nSelf paragraph\n\nNext paragraph"),
    true,
  );
});

test("buildBacklinkPreviewBacklinkData keeps the original backlink dom for the self fragment", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      visibleFragments: [{ sourceType: "self", text: "Self paragraph" }],
    }),
    contextVisibilityLevel: "nearby",
    deps: {
      markdownToBlockDOM: (markdown) => `<article>${markdown}</article>`,
    },
  });

  assert.equal(backlinkData.length, 1);
  assert.equal(backlinkData[0].dom, "<div data-node-id=\"block-self\">legacy</div>");
});

test("buildBacklinkPreviewBacklinkData rebuilds self fragment dom when it only contains a block reference", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: {
      ...createActiveBacklink({
        visibleFragments: [
          {
            sourceType: "self",
            text: "“OpenClaw” 安装 ——Skills",
            renderMarkdown:
              "((20260221114249-31dbi9g \"“OpenClaw” 安装 ——Skills\"))",
          },
        ],
      }),
      dom: "<div data-node-id=\"block-self\"></div>",
    },
    contextVisibilityLevel: "core",
    deps: {
      markdownToBlockDOM: (markdown) => `<article>${markdown}</article>`,
    },
  });

  assert.equal(backlinkData.length, 1);
  assert.equal(backlinkData[0].dom.includes("“OpenClaw” 安装 ——Skills"), true);
  assert.equal(backlinkData[0].dom.includes("20260221114249-31dbi9g"), false);
});

test("buildBacklinkPreviewBacklinkData removes duplicate preview fragments from the same source", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      visibleFragments: [
        { sourceType: "sibling_prev", text: "Repeated paragraph" },
        { sourceType: "sibling_prev", text: "Repeated paragraph" },
        { sourceType: "sibling_next", text: "Next paragraph" },
      ],
    }),
    contextVisibilityLevel: "nearby",
    deps: {
      markdownToBlockDOM: (markdown) => `<article>${markdown}</article>`,
    },
  });

  assert.equal(backlinkData.length, 2);
  assert.equal(backlinkData[0].dom.includes("Repeated paragraph"), true);
  assert.equal(backlinkData[1].dom.includes("Next paragraph"), true);
});

test("buildBacklinkPreviewBacklinkData uses renderMarkdown for sibling list items", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      visibleFragments: [
        {
          sourceType: "sibling_prev",
          text: "plain text sibling",
          renderMarkdown: "* list sibling ((20260215063907-mydglqs 'skill'))",
        },
        { sourceType: "self", text: "Self paragraph" },
      ],
    }),
    contextVisibilityLevel: "nearby",
    deps: {
      markdownToBlockDOM: (markdown) =>
        `<div data-node-id="generated">${markdown}</div>`,
    },
  });

  assert.equal(backlinkData[0].dom.includes("* list sibling skill"), true);
  assert.equal(backlinkData[0].dom.includes("20260215063907-mydglqs"), false);
  assert.equal(backlinkData[0].dom.includes("plain text sibling"), false);
  assert.equal(backlinkData[1].dom.includes("legacy"), true);
});

test("buildBacklinkPreviewBacklinkData strips kramdown ial lines and block ref ids from renderMarkdown", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      visibleFragments: [
        {
          sourceType: "sibling_prev",
          text: "plain text sibling",
          renderMarkdown:
            "* 品牌主色、辅色、渐变怎么用((20260215063907-mydglqs 'skill'))\n{: id=\"20251116213835-gcqgbnw\" updated=\"20260315090032\"}",
        },
      ],
    }),
    contextVisibilityLevel: "nearby",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(backlinkData[0].dom.includes("20260215063907-mydglqs"), false);
  assert.equal(backlinkData[0].dom.includes("{: id="), false);
  assert.equal(backlinkData[0].dom.includes("skill"), true);
});

test("buildBacklinkPreviewBacklinkData compacts loose list item markers into a single preview line", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      visibleFragments: [
        {
          sourceType: "sibling_prev",
          text: "plain text sibling",
          renderMarkdown:
            "*\nLOGO 在任何地方出现的尺寸和留白规则\n{: id=\"20251116213835-gcqgbnw\"}",
        },
      ],
    }),
    contextVisibilityLevel: "nearby",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(
    backlinkData[0].dom.includes("* LOGO 在任何地方出现的尺寸和留白规则"),
    true,
  );
  assert.equal(backlinkData[0].dom.includes("*\nLOGO"), false);
});

test("buildBacklinkPreviewBacklinkData dedupes repeated preview content across different sources", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      contextVisibilityLevel: "extended",
      visibleFragments: [
        {
          sourceType: "sibling_prev",
          text: "重复内容",
          renderMarkdown: "* 品牌主色、辅色、渐变怎么用 skill",
          visibilityLevel: "nearby",
        },
        {
          sourceType: "child_list",
          text: "重复内容",
          renderMarkdown: "* 品牌主色、辅色、渐变怎么用 skill",
          visibilityLevel: "nearby",
        },
        {
          sourceType: "self",
          text: "当前块",
          visibilityLevel: "core",
        },
      ],
    }),
    contextVisibilityLevel: "extended",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(backlinkData.length, 2);
  assert.equal(backlinkData[0].previewFragments[0].sourceType, "sibling_prev");
  assert.equal(backlinkData[1].previewFragments[0].sourceType, "self");
});

test("buildBacklinkPreviewBacklinkData uses renderMarkdown for parent fragments and excludes list-parent prompt text", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      contextVisibilityLevel: "extended",
      visibleFragments: [
        {
          sourceType: "parent",
          text: "- 父节点\n\n### 1. Skills 是什么？\n## 二、Skills：让 Claude 真正「学会干活」",
          renderMarkdown: "### 1. Skills 是什么？\n\n## 二、Skills：让 Claude 真正「学会干活」",
          visibilityLevel: "nearby",
        },
        { sourceType: "self", text: "当前块", visibilityLevel: "core" },
      ],
    }),
    contextVisibilityLevel: "extended",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(backlinkData[0].dom.includes("父节点"), false);
  assert.equal(backlinkData[0].dom.includes("### 1. Skills 是什么？"), true);
  assert.equal(backlinkData[0].dom.includes("## 二、Skills"), true);
});

test("buildBacklinkPreviewBacklinkData adds expanded siblings in extended mode", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      contextVisibilityLevel: "extended",
      visibleFragments: [
        { sourceType: "sibling_prev", text: "近邻", renderMarkdown: "- 近邻", visibilityLevel: "nearby" },
        { sourceType: "self", text: "当前块", visibilityLevel: "core" },
        { sourceType: "sibling_next", text: "标题字体", renderMarkdown: "- 标题字体", visibilityLevel: "nearby" },
        {
          sourceType: "expanded",
          text: "LOGO 不允许出现的低级审美错误",
          renderMarkdown: "- LOGO\n\n- 不允许出现的低级审美错误",
          visibilityLevel: "extended",
        },
      ],
    }),
    contextVisibilityLevel: "extended",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(backlinkData.length, 4);
  assert.equal(backlinkData[3].previewFragments[0].sourceType, "expanded");
  assert.equal(backlinkData[3].dom.includes("LOGO"), true);
  assert.equal(backlinkData[3].dom.includes("不允许出现的低级审美错误"), true);
});

test("buildBacklinkPreviewBacklinkData keeps multiple loose expanded list items separated", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      contextVisibilityLevel: "extended",
      visibleFragments: [
        {
          sourceType: "expanded",
          text: "扩展 PPT LOGO 错误",
          renderMarkdown:
            "-\n扩展\n\n-\nPPT 的版式有哪些固定模板\n\n-\nLOGO 在任何地方出现的尺寸和留白规则\n\n-\n不允许出现的低级审美错误",
          visibilityLevel: "extended",
        },
      ],
    }),
    contextVisibilityLevel: "extended",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(backlinkData.length, 1);
  assert.equal(backlinkData[0].dom.includes("- 扩展\n\n- PPT 的版式有哪些固定模板"), true);
  assert.equal(
    backlinkData[0].dom.includes("- LOGO 在任何地方出现的尺寸和留白规则\n\n- 不允许出现的低级审美错误"),
    true,
  );
  assert.equal(
    backlinkData[0].dom.includes("- 扩展 PPT 的版式有哪些固定模板"),
    false,
  );
});

test("buildBacklinkPreviewBacklinkData nests list siblings under the parent list item and keeps original order", () => {
  const backlinkData = buildBacklinkPreviewBacklinkData({
    activeBacklink: createActiveBacklink({
      contextVisibilityLevel: "extended",
      previewSequence: {
        extended: [
          {
            sequenceRole: "parent",
            sourceType: "parent",
            renderMarkdown:
              "## 二、Skills：让 Claude 真正「学会干活」\n\n### 1. Skills 是什么？\n\n- 上层节点",
          },
          {
            sequenceRole: "expanded_before",
            sourceType: "expanded",
            renderMarkdown: "- 扩展",
          },
          {
            sequenceRole: "sibling_prev",
            sourceType: "sibling_prev",
            renderMarkdown: "- 近邻",
          },
          {
            sequenceRole: "self",
            sourceType: "self",
            renderMarkdown: "- 品牌主色、辅色、渐变怎么用 skill",
          },
          {
            sequenceRole: "sibling_next",
            sourceType: "sibling_next",
            renderMarkdown: "- 标题字体、正文字体分别是什么",
          },
          {
            sequenceRole: "expanded_after",
            sourceType: "expanded",
            renderMarkdown:
              "- PPT 的版式有哪些固定模板\n\n- LOGO 在任何地方出现的尺寸和留白规则",
          },
        ],
      },
      visibleFragments: [{ sourceType: "self", text: "当前块" }],
    }),
    contextVisibilityLevel: "extended",
    deps: {
      markdownToBlockDOM: (markdown) => `<div>${markdown}</div>`,
    },
  });

  assert.equal(backlinkData.length, 1);
  assert.equal(
    backlinkData[0].dom.includes(
      "- 上层节点\n\n  - 扩展\n\n  - 近邻\n\n  - 品牌主色、辅色、渐变怎么用 skill\n\n  - 标题字体、正文字体分别是什么",
    ),
    true,
  );
  assert.equal(
    backlinkData[0].dom.includes(
      "  - PPT 的版式有哪些固定模板\n\n  - LOGO 在任何地方出现的尺寸和留白规则",
    ),
    true,
  );
});
