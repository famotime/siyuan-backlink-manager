import test from "node:test";
import assert from "node:assert/strict";

import {
  attachBacklinkSourceWindows,
  buildBacklinkSourceWindow,
  getBacklinkSourceWindowBodyRange,
  getBacklinkSourceWindowCandidateBlockIds,
  getBacklinkSourceWindowCollapsedBlockIds,
  getBacklinkSourceWindowContextPlan,
  getBacklinkSourceWindowIdentity,
  getBacklinkSourceWindowOrderedVisibleBlockIds,
  getBacklinkSourceWindowByLevel,
  hasBacklinkSourceWindowExplicitVisibleBlockIds,
  loadOrderedBacklinkSourceWindowBlocks,
} from "../src/service/backlink/backlink-source-window.js";
import { groupBacklinksByDocument } from "../src/components/panel/backlink-document-navigation.js";

function createDocumentBlocks(blocks = []) {
  return blocks.map((block, index) => ({
    root_id: "doc-a",
    parent_id: null,
    sort: index,
    path: `/doc-a/${index}`,
    subtype: "",
    ...block,
  }));
}

test("buildBacklinkSourceWindow uses the nearest heading section around the backlink block in extended mode", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "intro", type: "p", parent_id: "doc-a" },
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "item-expand", type: "i", parent_id: "list-root" },
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "heading-next", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow, {
    rootId: "doc-a",
    anchorBlockId: "item-brand",
    startBlockId: "heading-prev",
    endBlockId: "item-title",
    focusBlockId: "block-brand",
    sourceDocumentOrder: 5,
    windowBlockIds: [
      "heading-prev",
      "item-expand",
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
    ],
    defaultExpandMode: "document_local_full",
    visibleBlockIds: [
      "heading-prev",
      "item-expand",
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
    ],
    orderedVisibleBlockIds: [
      "heading-prev",
      "item-expand",
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
    ],
    contextPlan: {
      identity: {
        rootId: "doc-a",
        anchorBlockId: "item-brand",
        focusBlockId: "block-brand",
        sourceDocumentOrder: 5,
      },
      bodyRange: {
        startBlockId: "heading-prev",
        endBlockId: "item-title",
        windowBlockIds: [
          "heading-prev",
          "item-expand",
          "item-nearby",
          "item-brand",
          "block-brand",
          "item-title",
        ],
      },
      orderedVisibleBlockIds: [
        "heading-prev",
        "item-expand",
        "item-nearby",
        "item-brand",
        "block-brand",
        "item-title",
      ],
      collapsedBlockIds: [],
      structuralShellBlockIds: [
        "heading-prev",
        "item-expand",
        "item-nearby",
        "item-brand",
        "item-title",
      ],
    },
    renderMode: "scroll",
  });
});

test("source window getters prefer contextPlan and fall back to legacy fields", () => {
  assert.deepEqual(
    getBacklinkSourceWindowContextPlan({
      contextPlan: {
        identity: {
          rootId: "doc-a",
          anchorBlockId: "anchor-a",
          focusBlockId: "focus-a",
          sourceDocumentOrder: 7,
        },
        bodyRange: {
          startBlockId: "a",
          endBlockId: "b",
          windowBlockIds: ["a", "b"],
        },
        orderedVisibleBlockIds: ["a"],
        collapsedBlockIds: ["b"],
        structuralShellBlockIds: [],
      },
    }),
    {
      identity: {
        rootId: "doc-a",
        anchorBlockId: "anchor-a",
        focusBlockId: "focus-a",
        sourceDocumentOrder: 7,
      },
      bodyRange: {
        startBlockId: "a",
        endBlockId: "b",
        windowBlockIds: ["a", "b"],
      },
      orderedVisibleBlockIds: ["a"],
      collapsedBlockIds: ["b"],
      structuralShellBlockIds: [],
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowIdentity({
      contextPlan: {
        identity: {
          rootId: "doc-a",
          anchorBlockId: "anchor-a",
          focusBlockId: "focus-a",
          sourceDocumentOrder: 7,
        },
      },
      rootId: "legacy-doc",
      anchorBlockId: "legacy-anchor",
      focusBlockId: "legacy-focus",
      sourceDocumentOrder: 1,
    }),
    {
      rootId: "doc-a",
      anchorBlockId: "anchor-a",
      focusBlockId: "focus-a",
      sourceDocumentOrder: 7,
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowIdentity({
      rootId: "legacy-doc",
      anchorBlockId: "legacy-anchor",
      focusBlockId: "legacy-focus",
      sourceDocumentOrder: 1,
    }),
    {
      rootId: "legacy-doc",
      anchorBlockId: "legacy-anchor",
      focusBlockId: "legacy-focus",
      sourceDocumentOrder: 1,
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowIdentity({
      contextPlan: {
        identity: {
          anchorBlockId: "anchor-a",
        },
      },
      rootId: "legacy-doc",
      focusBlockId: "legacy-focus",
      sourceDocumentOrder: 1,
    }),
    {
      rootId: "legacy-doc",
      anchorBlockId: "anchor-a",
      focusBlockId: "legacy-focus",
      sourceDocumentOrder: 1,
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowBodyRange({
      contextPlan: {
        bodyRange: {
          startBlockId: "body-start",
          endBlockId: "body-end",
          windowBlockIds: ["body-start", "body-end"],
        },
      },
      startBlockId: "legacy-start",
      endBlockId: "legacy-end",
      windowBlockIds: ["legacy-start", "legacy-end"],
    }),
    {
      startBlockId: "body-start",
      endBlockId: "body-end",
      windowBlockIds: ["body-start", "body-end"],
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowBodyRange({
      startBlockId: "legacy-start",
      endBlockId: "legacy-end",
      windowBlockIds: ["legacy-start", "legacy-end"],
    }),
    {
      startBlockId: "legacy-start",
      endBlockId: "legacy-end",
      windowBlockIds: ["legacy-start", "legacy-end"],
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowBodyRange({
      contextPlan: {
        bodyRange: {
          startBlockId: "body-start",
        },
      },
      startBlockId: "legacy-start",
      endBlockId: "legacy-end",
      windowBlockIds: ["legacy-start", "legacy-end"],
    }),
    {
      startBlockId: "body-start",
      endBlockId: "legacy-end",
      windowBlockIds: ["legacy-start", "legacy-end"],
    },
  );

  assert.deepEqual(
    getBacklinkSourceWindowOrderedVisibleBlockIds({
      contextPlan: {
        orderedVisibleBlockIds: ["plan-a", "plan-b"],
      },
      orderedVisibleBlockIds: ["legacy-a"],
      visibleBlockIds: ["legacy-b"],
      windowBlockIds: ["legacy-c"],
    }),
    ["plan-a", "plan-b"],
  );

  assert.deepEqual(
    getBacklinkSourceWindowOrderedVisibleBlockIds({
      visibleBlockIds: ["legacy-visible"],
      windowBlockIds: ["legacy-window"],
    }),
    ["legacy-visible"],
  );

  assert.deepEqual(
    getBacklinkSourceWindowCollapsedBlockIds({
      contextPlan: {
        collapsedBlockIds: ["plan-collapsed"],
      },
      collapsedBlockIds: ["legacy-collapsed"],
    }),
    ["plan-collapsed"],
  );

  assert.deepEqual(
    getBacklinkSourceWindowCollapsedBlockIds({
      collapsedBlockIds: ["legacy-collapsed"],
    }),
    ["legacy-collapsed"],
  );

  assert.equal(
    hasBacklinkSourceWindowExplicitVisibleBlockIds({
      contextPlan: {
        orderedVisibleBlockIds: ["item-shell", "block-focus"],
        collapsedBlockIds: ["list-nested", "item-nested", "block-nested"],
      },
    }),
    true,
  );

  assert.equal(
    hasBacklinkSourceWindowExplicitVisibleBlockIds({
      contextPlan: {
        orderedVisibleBlockIds: ["block-a", "block-b"],
        collapsedBlockIds: [],
      },
    }),
    false,
  );

  const backlinkData = {
    sourceWindows: {
      nearby: {
        contextPlan: {
          identity: {
            anchorBlockId: "item-a",
            focusBlockId: "block-a",
          },
          bodyRange: {
            startBlockId: "item-prev",
            endBlockId: "item-next",
            windowBlockIds: ["item-prev", "item-a", "block-a", "item-next"],
          },
        },
      },
    },
    sourceWindow: {
      anchorBlockId: "legacy-extended",
    },
  };

  assert.deepEqual(
    getBacklinkSourceWindowByLevel(backlinkData, "nearby"),
    backlinkData.sourceWindows.nearby,
  );
  assert.deepEqual(
    getBacklinkSourceWindowByLevel(backlinkData, "extended"),
    backlinkData.sourceWindow,
  );
  assert.equal(getBacklinkSourceWindowByLevel(backlinkData, "core"), null);

  assert.deepEqual(
    getBacklinkSourceWindowCandidateBlockIds({
      backlinkBlockId: "backlink-a",
      sourceWindow: backlinkData.sourceWindows.nearby,
    }),
    ["backlink-a", "item-a", "block-a", "item-prev", "item-next"],
  );
});

test("buildBacklinkSourceWindow keeps the list item shell as the anchor for extended mode when the backlink is inside a list item", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "block-nearby", type: "p", parent_id: "item-nearby" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "block-title", type: "p", parent_id: "item-title" },
    { id: "heading-next", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.equal(sourceWindow.anchorBlockId, "item-brand");
  assert.equal(sourceWindow.focusBlockId, "block-brand");
  assert.equal(sourceWindow.startBlockId, "heading-prev");
  assert.equal(sourceWindow.endBlockId, "block-title");
  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-prev",
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "block-title",
  ]);
});

test("buildBacklinkSourceWindow falls back to the nearest structural container when no headings exist", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "intro", type: "p", parent_id: "doc-a" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, ["item-brand", "block-brand"]);
  assert.equal(sourceWindow.startBlockId, "item-brand");
  assert.equal(sourceWindow.endBlockId, "block-brand");
});

test("buildBacklinkSourceWindow keeps lower-level headings inside the current extended section until the next same-level heading", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-h2-a", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "heading-h3-a", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-a", type: "p", parent_id: "doc-a" },
    { id: "heading-h3-b", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-b", type: "p", parent_id: "doc-a" },
    { id: "heading-h2-b", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-h2-a",
    "block-focus",
    "heading-h3-a",
    "block-a",
    "heading-h3-b",
    "block-b",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-h2-a");
  assert.equal(sourceWindow.endBlockId, "block-b");
});

test("buildBacklinkSourceWindow uses the nearest top-level structural container when no headings exist in extended mode", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "intro", type: "p", parent_id: "doc-a" },
    { id: "list-root-a", type: "l", parent_id: "doc-a" },
    { id: "item-a", type: "i", parent_id: "list-root-a" },
    { id: "item-focus", type: "i", parent_id: "list-root-a" },
    { id: "block-focus", type: "p", parent_id: "item-focus" },
    { id: "item-b", type: "i", parent_id: "list-root-a" },
    { id: "after", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "item-focus",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "list-root-a",
    "item-a",
    "item-focus",
    "block-focus",
    "item-b",
  ]);
  assert.equal(sourceWindow.startBlockId, "list-root-a");
  assert.equal(sourceWindow.endBlockId, "item-b");
});

test("buildBacklinkSourceWindow uses the document preface before the first heading for ordinary blocks without a heading section", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "intro-a", type: "p", parent_id: "doc-a" },
    { id: "intro-focus", type: "p", parent_id: "doc-a" },
    { id: "intro-b", type: "p", parent_id: "doc-a" },
    { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "body-a", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "intro-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "intro-a",
    "intro-focus",
    "intro-b",
  ]);
  assert.equal(sourceWindow.startBlockId, "intro-a");
  assert.equal(sourceWindow.endBlockId, "intro-b");
});

test("buildBacklinkSourceWindow uses the full document preface before the first heading even when the focus is inside a list", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "intro-a", type: "p", parent_id: "doc-a" },
    { id: "list-root", type: "l", parent_id: "doc-a" },
    { id: "item-focus", type: "i", parent_id: "list-root" },
    { id: "block-focus", type: "p", parent_id: "item-focus" },
    { id: "item-tail", type: "i", parent_id: "list-root" },
    { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "body-a", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "item-focus",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "intro-a",
    "list-root",
    "item-focus",
    "block-focus",
    "item-tail",
  ]);
  assert.equal(sourceWindow.startBlockId, "intro-a");
  assert.equal(sourceWindow.endBlockId, "item-tail");
});

test("buildBacklinkSourceWindow keeps core mode on the original paragraph block", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-what", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-official", type: "p", parent_id: "doc-a" },
    { id: "block-quote", type: "b", parent_id: "doc-a" },
    { id: "block-toolkit", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-official",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.deepEqual(sourceWindow, {
    rootId: "doc-a",
    anchorBlockId: "block-official",
    startBlockId: "block-official",
    endBlockId: "block-official",
    focusBlockId: "block-official",
    sourceDocumentOrder: 2,
    windowBlockIds: ["block-official"],
    visibleBlockIds: ["block-official"],
    orderedVisibleBlockIds: ["block-official"],
    contextPlan: {
      identity: {
        rootId: "doc-a",
        anchorBlockId: "block-official",
        focusBlockId: "block-official",
        sourceDocumentOrder: 2,
      },
      bodyRange: {
        startBlockId: "block-official",
        endBlockId: "block-official",
        windowBlockIds: ["block-official"],
      },
      orderedVisibleBlockIds: ["block-official"],
      collapsedBlockIds: [],
      structuralShellBlockIds: [],
    },
    defaultExpandMode: "document_local_full",
    renderMode: "scroll",
  });
});

test("buildBacklinkSourceWindow keeps nearby mode on the surrounding original paragraphs", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-what", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-toolkit", type: "p", parent_id: "doc-a" },
    { id: "block-example", type: "p", parent_id: "doc-a" },
    { id: "block-after", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-example",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
      previousSiblingBlockId: "block-toolkit",
      nextSiblingBlockId: "block-after",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow, {
    rootId: "doc-a",
    anchorBlockId: "block-example",
    startBlockId: "block-toolkit",
    endBlockId: "block-after",
    focusBlockId: "block-example",
    sourceDocumentOrder: 3,
    windowBlockIds: ["block-toolkit", "block-example", "block-after"],
    defaultExpandMode: "document_local_full",
    visibleBlockIds: ["block-toolkit", "block-example", "block-after"],
    orderedVisibleBlockIds: ["block-toolkit", "block-example", "block-after"],
    contextPlan: {
      identity: {
        rootId: "doc-a",
        anchorBlockId: "block-example",
        focusBlockId: "block-example",
        sourceDocumentOrder: 3,
      },
      bodyRange: {
        startBlockId: "block-toolkit",
        endBlockId: "block-after",
        windowBlockIds: ["block-toolkit", "block-example", "block-after"],
      },
      orderedVisibleBlockIds: ["block-toolkit", "block-example", "block-after"],
      collapsedBlockIds: [],
      structuralShellBlockIds: [],
    },
    renderMode: "scroll",
  });
});

test("buildBacklinkSourceWindow prefers same-parent siblings for ordinary nearby mode", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "list-root", type: "l", parent_id: "doc-a" },
    { id: "item-a", type: "i", parent_id: "list-root" },
    { id: "block-a", type: "p", parent_id: "item-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "block-next", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "list-root",
    "item-a",
    "block-a",
    "block-focus",
    "block-next",
  ]);
  assert.equal(sourceWindow.startBlockId, "list-root");
  assert.equal(sourceWindow.endBlockId, "block-next");
});

test("buildBacklinkSourceWindow keeps nearby mode on the adjacent blocks for ordinary backlinks without expanding their heading sections", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-alpha", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-before", type: "p", parent_id: "doc-a" },
    { id: "heading-beta", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "heading-gamma", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-beta",
    "block-focus",
    "heading-gamma",
  ]);
  assert.deepEqual(sourceWindow.visibleBlockIds, [
    "heading-beta",
    "block-focus",
    "heading-gamma",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-beta");
  assert.equal(sourceWindow.endBlockId, "heading-gamma");
});

test("buildBacklinkSourceWindow keeps nearby mode on the paragraph before and after a heading backlink block", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-before-heading", type: "p", parent_id: "doc-a" },
    { id: "heading-focus", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after-heading", type: "p", parent_id: "doc-a" },
    { id: "block-tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "heading-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "h",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "block-before-heading",
    "heading-focus",
    "block-after-heading",
  ]);
  assert.equal(sourceWindow.startBlockId, "block-before-heading");
  assert.equal(sourceWindow.endBlockId, "block-after-heading");
});

test("buildBacklinkSourceWindow keeps the previous list shell visible for heading nearby mode instead of jumping to its child block", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "list-root", type: "l", parent_id: "doc-a" },
    { id: "item-prev", type: "i", parent_id: "list-root" },
    { id: "block-prev", type: "p", parent_id: "item-prev" },
    { id: "heading-focus", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after-heading", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "heading-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "h",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "list-root",
    "item-prev",
    "block-prev",
    "heading-focus",
    "block-after-heading",
  ]);
  assert.equal(sourceWindow.startBlockId, "list-root");
  assert.equal(sourceWindow.endBlockId, "block-after-heading");
});

test("buildBacklinkSourceWindow nearby mode for heading backlinks does not pull in the previous heading when no paragraph exists", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-focus", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after-heading", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "heading-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "h",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-focus",
    "block-after-heading",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-focus");
  assert.equal(sourceWindow.endBlockId, "block-after-heading");
});

test("buildBacklinkSourceWindow keeps heading extended mode on the current heading section when previous headings have no body content", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-focus", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after-heading", type: "p", parent_id: "doc-a" },
    { id: "heading-next", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "heading-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "h",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-focus",
    "block-after-heading",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-focus");
  assert.equal(sourceWindow.endBlockId, "block-after-heading");
});

test("buildBacklinkSourceWindow extends heading backlinks from the previous paragraph section through the current heading section", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-before-heading", type: "p", parent_id: "doc-a" },
    { id: "heading-focus", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after-heading", type: "p", parent_id: "doc-a" },
    { id: "heading-nested", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-nested", type: "p", parent_id: "doc-a" },
    { id: "heading-next", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "heading-focus",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "h",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-prev",
    "block-before-heading",
    "heading-focus",
    "block-after-heading",
    "heading-nested",
    "block-nested",
  ]);
  assert.deepEqual(sourceWindow.orderedVisibleBlockIds, [
    "heading-prev",
    "block-before-heading",
    "heading-focus",
    "block-after-heading",
    "heading-nested",
    "block-nested",
  ]);
  assert.deepEqual(sourceWindow.contextPlan?.collapsedBlockIds, []);
  assert.deepEqual(sourceWindow.contextPlan?.identity, {
    rootId: "doc-a",
    anchorBlockId: "heading-focus",
    focusBlockId: "heading-focus",
    sourceDocumentOrder: 2,
  });
  assert.deepEqual(sourceWindow.contextPlan?.structuralShellBlockIds, [
    "heading-prev",
    "heading-focus",
    "heading-nested",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-prev");
  assert.equal(sourceWindow.endBlockId, "block-nested");
});

test("buildBacklinkSourceWindow keeps nearby mode on sibling list items and adds explicit shell visibility metadata", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-what", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-tail", type: "p", parent_id: "doc-a" },
    { id: "item-expand", type: "i", parent_id: "list-root" },
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "list-title", type: "l", parent_id: "item-title" },
    { id: "item-logo", type: "i", parent_id: "list-title" },
    { id: "block-logo", type: "p", parent_id: "item-logo" },
    { id: "item-bad", type: "i", parent_id: "list-root" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      previousSiblingBlockId: "item-nearby",
      nextSiblingBlockId: "item-title",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow, {
    rootId: "doc-a",
    anchorBlockId: "item-brand",
    startBlockId: "item-nearby",
    endBlockId: "block-logo",
    focusBlockId: "block-brand",
    sourceDocumentOrder: 6,
    windowBlockIds: [
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
      "list-title",
      "item-logo",
      "block-logo",
    ],
    defaultExpandMode: "document_local_full",
    visibleBlockIds: [
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
      "list-title",
      "item-logo",
      "block-logo",
    ],
    orderedVisibleBlockIds: [
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
      "list-title",
      "item-logo",
      "block-logo",
    ],
    contextPlan: {
      identity: {
        rootId: "doc-a",
        anchorBlockId: "item-brand",
        focusBlockId: "block-brand",
        sourceDocumentOrder: 6,
      },
      bodyRange: {
        startBlockId: "item-nearby",
        endBlockId: "block-logo",
        windowBlockIds: [
          "item-nearby",
          "item-brand",
          "block-brand",
          "item-title",
          "list-title",
          "item-logo",
          "block-logo",
        ],
      },
      orderedVisibleBlockIds: [
        "item-nearby",
        "item-brand",
        "block-brand",
        "item-title",
        "list-title",
        "item-logo",
        "block-logo",
      ],
      collapsedBlockIds: [],
      structuralShellBlockIds: [
        "item-nearby",
        "item-brand",
        "item-title",
        "list-title",
        "item-logo",
      ],
    },
    renderMode: "scroll",
  });
});

test("buildBacklinkSourceWindow keeps nearby list mode on the anchor shell when only one sibling exists", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "block-title", type: "p", parent_id: "item-title" },
    { id: "tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      nextSiblingBlockId: "item-title",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-brand",
    "block-brand",
    "item-title",
    "block-title",
  ]);
  assert.equal(sourceWindow.startBlockId, "item-brand");
  assert.equal(sourceWindow.endBlockId, "block-title");
  assert.deepEqual(sourceWindow.visibleBlockIds, [
    "item-brand",
    "block-brand",
    "item-title",
    "block-title",
  ]);
  assert.equal(sourceWindow.renderMode, "scroll");
});

test("buildBacklinkSourceWindow keeps nearby list mode on the anchor shell when only the previous sibling exists", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "block-nearby", type: "p", parent_id: "item-nearby" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      previousSiblingBlockId: "item-nearby",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
  ]);
  assert.equal(sourceWindow.startBlockId, "item-nearby");
  assert.equal(sourceWindow.endBlockId, "block-brand");
  assert.deepEqual(sourceWindow.visibleBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
  ]);
  assert.equal(sourceWindow.renderMode, "scroll");
});

test("buildBacklinkSourceWindow keeps nearby list mode on the anchor shell when no siblings exist", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "tail", type: "p", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-brand",
    "block-brand",
  ]);
  assert.equal(sourceWindow.startBlockId, "item-brand");
  assert.equal(sourceWindow.endBlockId, "block-brand");
  assert.deepEqual(sourceWindow.visibleBlockIds, [
    "item-brand",
    "block-brand",
  ]);
  assert.equal(sourceWindow.renderMode, "scroll");
});

test("buildBacklinkSourceWindow uses the previous sibling text block as the nearby render start for nested list items", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-skills", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-what", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "block-nearby", type: "p", parent_id: "item-nearby" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "block-title", type: "p", parent_id: "item-title" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      previousSiblingBlockId: "item-nearby",
      nextSiblingBlockId: "item-title",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.equal(sourceWindow.anchorBlockId, "item-brand");
  assert.equal(sourceWindow.startBlockId, "item-nearby");
  assert.equal(sourceWindow.endBlockId, "block-title");
  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "block-title",
  ]);
});

test("buildBacklinkSourceWindow keeps list core mode focused on the list shell and focus child with subtree collapsed", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "list-children", type: "l", parent_id: "item-brand" },
    { id: "item-child", type: "i", parent_id: "list-children" },
    { id: "block-child", type: "p", parent_id: "item-child" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-brand",
    "block-brand",
    "list-children",
    "item-child",
    "block-child",
  ]);
  assert.deepEqual(sourceWindow.visibleBlockIds, ["item-brand", "block-brand"]);
  assert.deepEqual(sourceWindow.contextPlan?.bodyRange?.windowBlockIds, [
    "item-brand",
    "block-brand",
    "list-children",
    "item-child",
    "block-child",
  ]);
  assert.deepEqual(sourceWindow.contextPlan?.identity, {
    rootId: "doc-a",
    anchorBlockId: "item-brand",
    focusBlockId: "block-brand",
    sourceDocumentOrder: 1,
  });
  assert.deepEqual(sourceWindow.contextPlan?.orderedVisibleBlockIds, [
    "item-brand",
    "block-brand",
  ]);
  assert.deepEqual(sourceWindow.contextPlan?.collapsedBlockIds, [
    "list-children",
    "item-child",
    "block-child",
  ]);
  assert.deepEqual(sourceWindow.contextPlan?.structuralShellBlockIds, [
    "item-brand",
  ]);
});

test("buildBacklinkSourceWindow keeps nearby list mode on shells and direct readable children instead of entire neighbor subtrees", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "block-nearby", type: "p", parent_id: "item-nearby" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "list-title", type: "l", parent_id: "item-title" },
    { id: "item-logo", type: "i", parent_id: "list-title" },
    { id: "block-logo", type: "p", parent_id: "item-logo" },
    { id: "item-deep", type: "i", parent_id: "list-title" },
    { id: "block-deep", type: "p", parent_id: "item-deep" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      previousSiblingBlockId: "item-nearby",
      nextSiblingBlockId: "item-title",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.visibleBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "list-title",
    "item-logo",
    "block-logo",
  ]);
  assert.deepEqual(sourceWindow.orderedVisibleBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "list-title",
    "item-logo",
    "block-logo",
  ]);
  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "list-title",
    "item-logo",
    "block-logo",
  ]);
  assert.deepEqual(sourceWindow.contextPlan?.collapsedBlockIds, []);
});

test("buildBacklinkSourceWindow keeps nearby list mode from descending past the first direct child item shell", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "block-nearby", type: "p", parent_id: "item-nearby" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "list-title", type: "l", parent_id: "item-title" },
    { id: "item-logo", type: "i", parent_id: "list-title" },
    { id: "list-logo", type: "l", parent_id: "item-logo" },
    { id: "item-mark", type: "i", parent_id: "list-logo" },
    { id: "block-mark", type: "p", parent_id: "item-mark" },
    { id: "item-tail", type: "i", parent_id: "list-title" },
    { id: "block-tail", type: "p", parent_id: "item-tail" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      previousSiblingBlockId: "item-nearby",
      nextSiblingBlockId: "item-title",
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "nearby",
  });

  assert.deepEqual(sourceWindow.visibleBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "list-title",
    "item-logo",
  ]);
  assert.deepEqual(sourceWindow.windowBlockIds, [
    "item-nearby",
    "block-nearby",
    "item-brand",
    "block-brand",
    "item-title",
    "list-title",
    "item-logo",
  ]);
  assert.deepEqual(sourceWindow.contextPlan?.collapsedBlockIds, []);
});

test("attachBacklinkSourceWindows adds heading-bounded source windows to extended backlinks", () => {
  const backlinks = [
    {
      backlinkBlock: {
        id: "block-brand",
        root_id: "doc-a",
      },
    },
    {
      backlinkBlock: {
        id: "block-nearby",
        root_id: "doc-a",
      },
    },
  ];
  const backlinkBlockNodeArray = [
    {
      block: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
      },
      parentContextBlockIds: ["heading-h2"],
      previousSiblingBlockId: "item-nearby",
      nextSiblingBlockId: "item-title",
      beforeExpandedBlockIdArray: [],
      afterExpandedBlockIdArray: [],
    },
    {
      block: {
        id: "block-nearby",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "p",
      },
    },
  ];
  const orderedBlocksByRootId = new Map([
    [
      "doc-a",
      createDocumentBlocks([
        { id: "intro", type: "p", parent_id: "doc-a" },
        { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
        { id: "item-nearby", type: "i", parent_id: "list-root" },
        { id: "item-brand", type: "i", parent_id: "list-root" },
        { id: "block-brand", type: "p", parent_id: "item-brand" },
        { id: "item-title", type: "i", parent_id: "list-root" },
        { id: "heading-next", type: "h", subtype: "h2", parent_id: "doc-a" },
        { id: "block-nearby", type: "p", parent_id: "doc-a" },
      ]),
    ],
  ]);

  attachBacklinkSourceWindows({
    backlinkDataArray: backlinks,
    backlinkBlockNodeArray,
    orderedBlocksByRootId,
    contextVisibilityLevel: "extended",
  });

  assert.equal(backlinks[0].sourceWindow.startBlockId, "heading-h2");
  assert.equal(backlinks[0].sourceWindow.endBlockId, "item-title");
  assert.deepEqual(backlinks[0].sourceWindow.windowBlockIds, [
    "heading-h2",
    "item-nearby",
    "item-brand",
    "block-brand",
    "item-title",
  ]);
  assert.equal(backlinks[1].sourceWindow.startBlockId, "heading-next");
  assert.equal(backlinks[1].sourceWindow.endBlockId, "block-nearby");
});

test("loadOrderedBacklinkSourceWindowBlocks preserves parent-before-child tree order when block indexes are unavailable", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-brand",
          root_id: "doc-a",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-brand",
          root_id: "doc-a",
          parent_id: "item-brand",
          type: "p",
          sort: 10,
          path: "/doc-a/list",
        },
        {
          id: "item-brand",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "i",
          sort: 20,
          path: "/doc-a/list",
        },
        {
          id: "item-next",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "i",
          sort: 20,
          path: "/doc-a/list",
        },
      ],
      getBlockIndexMap: async () => new Map(),
    },
  });

  assert.deepEqual(
    orderedBlocksByRootId.get("doc-a").map((block) => block.id),
    ["item-brand", "block-brand", "item-next"],
  );
});

test("loadOrderedBacklinkSourceWindowBlocks keeps original query order when fallback metadata ties", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-focus",
          root_id: "doc-a",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-tail",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
        {
          id: "block-focus",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
        {
          id: "block-intro",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
      ],
      getBlockIndexMap: async () => new Map(),
    },
  });

  assert.deepEqual(
    orderedBlocksByRootId.get("doc-a").map((block) => block.id),
    ["block-tail", "block-focus", "block-intro"],
  );
});

test("loadOrderedBacklinkSourceWindowBlocks keeps original relative order when only part of the document has explicit order indexes", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-focus",
          root_id: "doc-a",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-tail",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
        {
          id: "block-focus",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
        {
          id: "block-intro",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
      ],
      getBlockIndexMap: async () =>
        new Map([
          ["block-focus", 1],
        ]),
    },
  });

  assert.deepEqual(
    orderedBlocksByRootId.get("doc-a").map((block) => block.id),
    ["block-tail", "block-focus", "block-intro"],
  );
});

test("loadOrderedBacklinkSourceWindowBlocks keeps original relative order when parent child order is only partially known", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-focus",
          root_id: "doc-a",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-tail",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
        {
          id: "block-focus",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
        {
          id: "block-intro",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "p",
          sort: 10,
          path: "/doc-a/same",
        },
      ],
      getBlockIndexMap: async () => new Map(),
      getChildBlocks: async () => [
        { id: "block-focus" },
        { id: "block-intro" },
      ],
    },
  });

  assert.deepEqual(
    orderedBlocksByRootId.get("doc-a").map((block) => block.id),
    ["block-tail", "block-focus", "block-intro"],
  );
});

test("document navigation uses block index order when indexes are available", async () => {
  const backlinkDataArray = [
    {
      backlinkBlock: {
        id: "block-brand",
        root_id: "doc-a",
        parent_id: "item-brand",
        type: "p",
        content: "brand",
        box: "box-a",
      },
    },
    {
      backlinkBlock: {
        id: "item-next",
        root_id: "doc-a",
        parent_id: "doc-a",
        type: "i",
        content: "next",
        box: "box-a",
      },
    },
  ];
  const backlinkBlockNodeArray = backlinkDataArray.map((backlinkData) => ({
    block: backlinkData.backlinkBlock,
  }));
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray,
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-brand",
          root_id: "doc-a",
          parent_id: "item-brand",
          type: "p",
          sort: 10,
          path: "/doc-a/list",
        },
        {
          id: "item-brand",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "i",
          sort: 20,
          path: "/doc-a/list",
        },
        {
          id: "item-next",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "i",
          sort: 30,
          path: "/doc-a/list-next",
        },
      ],
      getBlockIndexMap: async () =>
        new Map([
          ["item-brand", 0],
          ["item-next", 1],
          ["block-brand", 2],
        ]),
    },
  });
  attachBacklinkSourceWindows({
    backlinkDataArray,
    backlinkBlockNodeArray,
    orderedBlocksByRootId,
  });
  const groups = groupBacklinksByDocument(
    [{ id: "doc-a", content: "Alpha" }],
    backlinkDataArray,
  );

  assert.deepEqual(groups[0].backlinks.map((backlink) => backlink.backlinkBlock.id), [
    "item-next",
    "block-brand",
  ]);
});

test("loadOrderedBacklinkSourceWindowBlocks uses block indexes per document and falls back only for incomplete documents", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-brand",
          root_id: "doc-a",
        },
      },
      {
        backlinkBlock: {
          id: "block-beta",
          root_id: "doc-b",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-brand",
          root_id: "doc-a",
          parent_id: "item-brand",
          type: "p",
          sort: 10,
          path: "/doc-a/list",
        },
        {
          id: "item-brand",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "i",
          sort: 20,
          path: "/doc-a/list",
        },
        {
          id: "item-next",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "i",
          sort: 30,
          path: "/doc-a/list-next",
        },
        {
          id: "block-beta",
          root_id: "doc-b",
          parent_id: "item-beta",
          type: "p",
          sort: 10,
          path: "/doc-b/list",
        },
        {
          id: "item-beta",
          root_id: "doc-b",
          parent_id: "doc-b",
          type: "i",
          sort: 20,
          path: "/doc-b/list",
        },
        {
          id: "item-gamma",
          root_id: "doc-b",
          parent_id: "doc-b",
          type: "i",
          sort: 30,
          path: "/doc-b/list-next",
        },
      ],
      getBlockIndexMap: async () =>
        new Map([
          ["item-brand", 0],
          ["item-next", 1],
          ["block-brand", 2],
          ["item-beta", 0],
          ["item-gamma", 2],
        ]),
    },
  });

  assert.deepEqual(
    orderedBlocksByRootId.get("doc-a").map((block) => block.id),
    ["item-brand", "item-next", "block-brand"],
  );
  assert.deepEqual(
    orderedBlocksByRootId.get("doc-b").map((block) => block.id),
    ["item-beta", "block-beta", "item-gamma"],
  );
});

test("loadOrderedBacklinkSourceWindowBlocks keeps extended sections in real child order when indexes are incomplete", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-focus",
          root_id: "doc-a",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "block-focus",
          root_id: "doc-a",
          parent_id: "item-focus",
          type: "p",
          sort: 10,
          path: "/doc-a/doc",
        },
        {
          id: "heading-skill",
          root_id: "doc-a",
          parent_id: "heading-main",
          type: "h",
          subtype: "h3",
          sort: 5,
          path: "/doc-a/doc",
        },
        {
          id: "block-skill",
          root_id: "doc-a",
          parent_id: "heading-skill",
          type: "p",
          sort: 10,
          path: "/doc-a/doc",
        },
        {
          id: "heading-next",
          root_id: "doc-a",
          parent_id: "heading-main",
          type: "h",
          subtype: "h3",
          sort: 5,
          path: "/doc-a/doc",
        },
        {
          id: "block-next",
          root_id: "doc-a",
          parent_id: "heading-next",
          type: "p",
          sort: 10,
          path: "/doc-a/doc",
        },
        {
          id: "list-root",
          root_id: "doc-a",
          parent_id: "heading-main",
          type: "l",
          subtype: "u",
          sort: 20,
          path: "/doc-a/doc",
        },
        {
          id: "item-focus",
          root_id: "doc-a",
          parent_id: "list-root",
          type: "i",
          sort: 20,
          path: "/doc-a/doc",
        },
        {
          id: "heading-main",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "h",
          subtype: "h1",
          sort: 5,
          path: "/doc-a/doc",
        },
      ],
      getBlockIndexMap: async () => new Map(),
      getChildBlocks: async (parentId) => {
        if (parentId === "heading-main") {
          return [
            { id: "list-root" },
            { id: "heading-skill" },
            { id: "heading-next" },
          ];
        }
        return [];
      },
    },
  });

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "item-focus",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocksByRootId.get("doc-a"),
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-main",
    "list-root",
    "item-focus",
    "block-focus",
    "heading-skill",
    "block-skill",
    "heading-next",
    "block-next",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-main");
  assert.equal(sourceWindow.endBlockId, "block-next");
});

test("loadOrderedBacklinkSourceWindowBlocks uses document kramdown order when child order is incomplete and keeps heading titles in extended sections", async () => {
  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks({
    backlinkDataArray: [
      {
        backlinkBlock: {
          id: "block-focus",
          root_id: "doc-a",
        },
      },
    ],
    deps: {
      queryDocumentBlocksByRootIds: async () => [
        {
          id: "heading-next",
          root_id: "doc-a",
          parent_id: "heading-main",
          type: "h",
          subtype: "h3",
          sort: 5,
          path: "/doc-a/doc",
        },
        {
          id: "block-next",
          root_id: "doc-a",
          parent_id: "heading-next",
          type: "p",
          sort: 10,
          path: "/doc-a/doc",
        },
        {
          id: "list-root",
          root_id: "doc-a",
          parent_id: "heading-main",
          type: "l",
          subtype: "u",
          sort: 20,
          path: "/doc-a/doc",
        },
        {
          id: "item-focus",
          root_id: "doc-a",
          parent_id: "list-root",
          type: "i",
          sort: 20,
          path: "/doc-a/doc",
        },
        {
          id: "block-focus",
          root_id: "doc-a",
          parent_id: "item-focus",
          type: "p",
          sort: 10,
          path: "/doc-a/doc",
        },
        {
          id: "heading-skill",
          root_id: "doc-a",
          parent_id: "heading-main",
          type: "h",
          subtype: "h3",
          sort: 5,
          path: "/doc-a/doc",
        },
        {
          id: "block-skill",
          root_id: "doc-a",
          parent_id: "heading-skill",
          type: "p",
          sort: 10,
          path: "/doc-a/doc",
        },
        {
          id: "heading-main",
          root_id: "doc-a",
          parent_id: "doc-a",
          type: "h",
          subtype: "h1",
          sort: 5,
          path: "/doc-a/doc",
        },
      ],
      getBlockIndexMap: async () => new Map(),
      getChildBlocks: async (parentId) => {
        if (parentId === "heading-main") {
          return [{ id: "list-root" }];
        }
        if (parentId === "list-root") {
          return [{ id: "item-focus" }];
        }
        if (parentId === "heading-skill") {
          return [{ id: "block-skill" }];
        }
        if (parentId === "heading-next") {
          return [{ id: "block-next" }];
        }
        return [];
      },
      getBlockKramdown: async () => ({
        kramdown: [
          "### Main",
          "{: id=\"heading-main\"}",
          "",
          "- {: id=\"item-focus\"}Focus",
          "  {: id=\"block-focus\"}",
          "{: id=\"list-root\"}",
          "",
          "### Skill",
          "{: id=\"heading-skill\"}",
          "",
          "Skill body",
          "{: id=\"block-skill\"}",
          "",
          "### Next",
          "{: id=\"heading-next\"}",
          "",
          "Next body",
          "{: id=\"block-next\"}",
        ].join("\n"),
      }),
    },
  });

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: {
        id: "block-focus",
        root_id: "doc-a",
        parent_id: "item-focus",
        type: "p",
      },
    },
    orderedDocumentBlocks: orderedBlocksByRootId.get("doc-a"),
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "heading-main",
    "list-root",
    "item-focus",
    "block-focus",
    "heading-skill",
    "block-skill",
    "heading-next",
    "block-next",
  ]);
  assert.equal(sourceWindow.startBlockId, "heading-main");
  assert.equal(sourceWindow.endBlockId, "block-next");
});

// ── Verification samples from the rules document ──

test("verification sample 1: backlink on ordinary paragraph shows only that block in core", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-a", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-before", type: "p", parent_id: "doc-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "block-after", type: "p", parent_id: "doc-a" },
    { id: "heading-b", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "doc-a", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, ["block-focus"]);
  assert.deepEqual(sourceWindow.orderedVisibleBlockIds, ["block-focus"]);
  assert.deepEqual(sourceWindow.contextPlan?.collapsedBlockIds, []);
});

test("verification sample 2: backlink on paragraph at document start shows that block in core", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "block-after", type: "p", parent_id: "doc-a" },
    { id: "heading-a", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "doc-a", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, ["block-focus"]);
  assert.deepEqual(sourceWindow.orderedVisibleBlockIds, ["block-focus"]);
});

test("verification sample 3: backlink on list item title shows shell with subtree collapsed in core", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "list-root", type: "l", parent_id: "doc-a" },
    { id: "item-prev", type: "i", parent_id: "list-root" },
    { id: "block-prev", type: "p", parent_id: "item-prev" },
    { id: "item-focus", type: "i", parent_id: "list-root" },
    { id: "block-focus-text", type: "p", parent_id: "item-focus" },
    { id: "list-children", type: "l", parent_id: "item-focus" },
    { id: "item-child", type: "i", parent_id: "list-children" },
    { id: "block-child", type: "p", parent_id: "item-child" },
    { id: "item-next", type: "i", parent_id: "list-root" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "item-focus", root_id: "doc-a", parent_id: "list-root", type: "i" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.equal(sourceWindow.anchorBlockId, "item-focus");
  assert.deepEqual(sourceWindow.orderedVisibleBlockIds, [
    "item-focus",
    "block-focus-text",
  ]);
  assert.ok(
    sourceWindow.contextPlan?.collapsedBlockIds.length > 0,
    "list children should be collapsed",
  );
  assert.ok(
    sourceWindow.contextPlan?.collapsedBlockIds.includes("item-child"),
    "deep child items should be collapsed",
  );
});

test("verification sample 4: backlink on list item child block shows shell + focus with rest collapsed in core", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "list-root", type: "l", parent_id: "doc-a" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-title", type: "p", parent_id: "item-brand" },
    { id: "block-focus", type: "p", parent_id: "item-brand" },
    { id: "list-children", type: "l", parent_id: "item-brand" },
    { id: "item-child", type: "i", parent_id: "list-children" },
    { id: "block-child", type: "p", parent_id: "item-child" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "item-brand", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.equal(sourceWindow.anchorBlockId, "item-brand");
  assert.ok(sourceWindow.orderedVisibleBlockIds.includes("item-brand"), "shell visible");
  assert.ok(sourceWindow.orderedVisibleBlockIds.includes("block-focus"), "focus visible");
  assert.ok(
    sourceWindow.contextPlan?.collapsedBlockIds.includes("list-children"),
    "nested list collapsed",
  );
  assert.ok(
    sourceWindow.contextPlan?.collapsedBlockIds.includes("item-child"),
    "nested item collapsed",
  );
});

test("verification sample 5: backlink on heading shows only the heading in core", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-prev", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-before", type: "p", parent_id: "doc-a" },
    { id: "heading-focus", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-after", type: "p", parent_id: "doc-a" },
    { id: "heading-next", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "heading-focus", root_id: "doc-a", parent_id: "doc-a", type: "h" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });

  assert.deepEqual(sourceWindow.windowBlockIds, ["heading-focus"]);
  assert.deepEqual(sourceWindow.orderedVisibleBlockIds, ["heading-focus"]);
});

test("verification sample 6: multi-level headings respect same-or-higher boundary in extended", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-intro", type: "p", parent_id: "doc-a" },
    { id: "heading-h3-a", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "heading-h4", type: "h", subtype: "h4", parent_id: "doc-a" },
    { id: "block-deep", type: "p", parent_id: "doc-a" },
    { id: "heading-h3-b", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "block-other", type: "p", parent_id: "doc-a" },
    { id: "heading-h2-next", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const sourceWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "doc-a", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.equal(sourceWindow.startBlockId, "heading-h3-a");
  assert.equal(sourceWindow.endBlockId, "block-deep");
  assert.ok(
    !sourceWindow.windowBlockIds.includes("heading-h3-b"),
    "same-level heading should not be included",
  );
  assert.ok(
    sourceWindow.windowBlockIds.includes("heading-h4"),
    "lower-level heading should be included in the section",
  );
});

test("verification sample 7: continuous text range never hides middle blocks", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-a", type: "p", parent_id: "doc-a" },
    { id: "block-b", type: "p", parent_id: "doc-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "block-c", type: "p", parent_id: "doc-a" },
    { id: "heading-h2-next", type: "h", subtype: "h2", parent_id: "doc-a" },
  ]);

  const coreWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "doc-a", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "core",
  });
  assert.deepEqual(coreWindow.windowBlockIds, ["block-focus"]);
  assert.deepEqual(coreWindow.contextPlan?.collapsedBlockIds, []);

  const extendedWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "doc-a", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });
  assert.deepEqual(extendedWindow.contextPlan?.collapsedBlockIds, []);
  assert.deepEqual(extendedWindow.windowBlockIds, [
    "heading-h2",
    "block-a",
    "block-b",
    "block-focus",
    "block-c",
  ]);
});

test("verification sample 8: text display order matches original document order", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "block-a", type: "p", parent_id: "doc-a" },
    { id: "block-focus", type: "p", parent_id: "doc-a" },
    { id: "block-b", type: "p", parent_id: "doc-a" },
  ]);

  const extendedWindow = buildBacklinkSourceWindow({
    backlinkBlockNode: {
      block: { id: "block-focus", root_id: "doc-a", parent_id: "doc-a", type: "p" },
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  const orderedDocIds = orderedBlocks.map((b) => b.id);
  const visibleInDocOrder = extendedWindow.orderedVisibleBlockIds.every((id, i, arr) => {
    if (i === 0) return true;
    return orderedDocIds.indexOf(id) > orderedDocIds.indexOf(arr[i - 1]);
  });
  assert.ok(visibleInDocOrder, "visible block order must match document order");
});
