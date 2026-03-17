import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkPanelInitStrategy,
  resolveBacklinkPanelFocusRefresh,
} from "../src/components/panel/backlink-panel-focus-refresh.js";

test("buildBacklinkPanelInitStrategy resets document-scoped state on the first load and root changes", () => {
  assert.deepEqual(
    buildBacklinkPanelInitStrategy({
      previousRootId: "",
      rootId: "doc-a",
      hasQueryParams: false,
    }),
    {
      rootChanged: true,
      resetDocumentActiveIndexes: true,
      reuseExistingQueryParams: false,
      applyDefaultSelectedViewBlock: true,
    },
  );

  assert.deepEqual(
    buildBacklinkPanelInitStrategy({
      previousRootId: "doc-a",
      rootId: "doc-b",
      hasQueryParams: true,
    }),
    {
      rootChanged: true,
      resetDocumentActiveIndexes: true,
      reuseExistingQueryParams: false,
      applyDefaultSelectedViewBlock: true,
    },
  );
});

test("buildBacklinkPanelInitStrategy preserves local document state when only the focus block changes", () => {
  assert.deepEqual(
    buildBacklinkPanelInitStrategy({
      previousRootId: "doc-a",
      rootId: "doc-a",
      hasQueryParams: true,
    }),
    {
      rootChanged: false,
      resetDocumentActiveIndexes: false,
      reuseExistingQueryParams: true,
      applyDefaultSelectedViewBlock: false,
    },
  );
});

test("resolveBacklinkPanelFocusRefresh only refreshes when the focused block changes inside the current root", () => {
  assert.deepEqual(
    resolveBacklinkPanelFocusRefresh({
      rootId: "doc-a",
      focusBlockId: "block-a",
      protyle: {
        block: {
          rootID: "doc-a",
          id: "block-b",
        },
      },
    }),
    {
      nextRootId: "doc-a",
      nextFocusBlockId: "block-b",
      shouldRefresh: true,
    },
  );

  assert.deepEqual(
    resolveBacklinkPanelFocusRefresh({
      rootId: "doc-a",
      focusBlockId: "block-a",
      protyle: {
        block: {
          rootID: "doc-a",
          id: "block-a",
        },
      },
    }),
    {
      nextRootId: "doc-a",
      nextFocusBlockId: "block-a",
      shouldRefresh: false,
    },
  );

  assert.deepEqual(
    resolveBacklinkPanelFocusRefresh({
      rootId: "doc-a",
      focusBlockId: "block-a",
      protyle: {
        block: {
          rootID: "doc-b",
          id: "block-b",
        },
      },
    }),
    {
      nextRootId: "doc-b",
      nextFocusBlockId: "block-b",
      shouldRefresh: false,
    },
  );
});
