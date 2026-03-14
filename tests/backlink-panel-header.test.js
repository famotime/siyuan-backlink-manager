import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkPaginationState,
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
