import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkContextControlState,
  buildBacklinkPaginationState,
  getBacklinkContextLevelLabel,
  getBacklinkSummaryText,
} from "../src/components/panel/backlink-panel-header.js";

test("builds visible pagination state with progress text between arrows", () => {
  assert.deepEqual(
    buildBacklinkPaginationState({
      pageNum: 2,
      totalPage: 4,
    }),
    {
      isVisible: true,
      progressText: "2/4",
      previousDisabled: false,
      nextDisabled: false,
    },
  );
});

test("disables previous and next arrows at pagination boundaries", () => {
  assert.deepEqual(
    buildBacklinkPaginationState({
      pageNum: 1,
      totalPage: 1,
    }),
    {
      isVisible: true,
      progressText: "1/1",
      previousDisabled: true,
      nextDisabled: true,
    },
  );
});

test("hides pagination state when there are no pages", () => {
  assert.deepEqual(
    buildBacklinkPaginationState({
      pageNum: 0,
      totalPage: 0,
    }),
    {
      isVisible: false,
      progressText: "",
      previousDisabled: true,
      nextDisabled: true,
    },
  );
});

test("prefers backlink document summary text when available", () => {
  assert.equal(
    getBacklinkSummaryText(
      {
        findInBacklinkDocument: "共 ${x} 个反链文档",
        findInBacklink: "共 ${x} 个反链块",
      },
      4,
    ),
    "共 4 个反链文档",
  );
});

test("falls back to backlink block summary text when document copy is missing", () => {
  assert.equal(
    getBacklinkSummaryText(
      {
        findInBacklink: "Found ${x} backlink blocks",
      },
      2,
    ),
    "Found 2 backlink blocks",
  );
});

test("returns the localized label for each backlink context level", () => {
  assert.equal(getBacklinkContextLevelLabel("core"), "核心");
  assert.equal(getBacklinkContextLevelLabel("nearby"), "近邻");
  assert.equal(getBacklinkContextLevelLabel("extended"), "扩展");
  assert.equal(getBacklinkContextLevelLabel("full"), "全文");
  assert.equal(getBacklinkContextLevelLabel("unknown"), "核心");
});

test("buildBacklinkContextControlState summarizes the current level and the next action", () => {
  assert.deepEqual(
    buildBacklinkContextControlState({
      contextVisibilityLevel: "nearby",
      activeBacklink: {
        contextBundle: {
          visibleFragments: [
            { sourceType: "self", visibilityLevel: "core" },
            { sourceType: "parent", visibilityLevel: "nearby" },
            { sourceType: "sibling_prev", visibilityLevel: "nearby" },
          ],
          budgetSummary: {
            truncated: true,
          },
        },
      },
    }),
    {
      contextVisibilityLevel: "nearby",
      levelLabel: "近邻",
      nextLevelLabel: "扩展",
      nextActionText: "下一步：扩展",
      visibleSourceSummary: "已显示：父级、前相邻块",
      budgetHint: "部分上下文已裁剪，继续展开查看更多",
      previousDisabled: false,
      nextDisabled: false,
    },
  );
});

test("buildBacklinkContextControlState hides the next action once full mode is reached", () => {
  assert.deepEqual(
    buildBacklinkContextControlState({
      contextVisibilityLevel: "full",
      activeBacklink: {
        contextBundle: {
          visibleFragments: [],
          budgetSummary: {
            truncated: true,
          },
        },
      },
    }),
    {
      contextVisibilityLevel: "full",
      levelLabel: "全文",
      nextLevelLabel: "全文",
      nextActionText: "",
      visibleSourceSummary: "已进入全文模式",
      budgetHint: "",
      previousDisabled: false,
      nextDisabled: false,
    },
  );
});

test("buildBacklinkContextControlState keeps context navigation enabled at every level", () => {
  assert.deepEqual(
    buildBacklinkContextControlState({
      contextVisibilityLevel: "core",
      activeBacklink: null,
    }),
    {
      contextVisibilityLevel: "core",
      levelLabel: "核心",
      nextLevelLabel: "近邻",
      nextActionText: "下一步：近邻",
      visibleSourceSummary: "",
      budgetHint: "",
      previousDisabled: false,
      nextDisabled: false,
    },
  );

  assert.deepEqual(
    buildBacklinkContextControlState({
      contextVisibilityLevel: "full",
      activeBacklink: null,
    }),
    {
      contextVisibilityLevel: "full",
      levelLabel: "全文",
      nextLevelLabel: "全文",
      nextActionText: "",
      visibleSourceSummary: "已进入全文模式",
      budgetHint: "",
      previousDisabled: false,
      nextDisabled: false,
    },
  );
});

test("buildBacklinkContextControlState exposes an explicit degraded hint when source window is unavailable", () => {
  assert.deepEqual(
    buildBacklinkContextControlState({
      contextVisibilityLevel: "extended",
      activeBacklink: {
        backlinkBlock: {
          id: "block-a",
        },
        sourceWindows: {},
        contextBundle: {
          visibleFragments: [],
        },
      },
    }),
    {
      contextVisibilityLevel: "extended",
      levelLabel: "扩展",
      nextLevelLabel: "全文",
      nextActionText: "下一步：全文",
      visibleSourceSummary: "",
      budgetHint: "原文上下文不可用，当前显示为降级结果",
      previousDisabled: false,
      nextDisabled: false,
    },
  );
});

test("buildBacklinkContextControlState hides the degraded hint in full mode", () => {
  assert.deepEqual(
    buildBacklinkContextControlState({
      contextVisibilityLevel: "full",
      activeBacklink: {
        backlinkBlock: {
          id: "block-a",
        },
        sourceWindows: {},
        contextBundle: {
          visibleFragments: [],
        },
      },
    }),
    {
      contextVisibilityLevel: "full",
      levelLabel: "全文",
      nextLevelLabel: "全文",
      nextActionText: "",
      visibleSourceSummary: "已进入全文模式",
      budgetHint: "",
      previousDisabled: false,
      nextDisabled: false,
    },
  );
});
