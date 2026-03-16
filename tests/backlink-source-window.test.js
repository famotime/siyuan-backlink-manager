import test from "node:test";
import assert from "node:assert/strict";

import {
  attachBacklinkSourceWindows,
  buildBacklinkSourceWindow,
  loadOrderedBacklinkSourceWindowBlocks,
} from "../src/service/backlink/backlink-source-window.js";

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
    anchorBlockId: "block-brand",
    startBlockId: "heading-prev",
    endBlockId: "item-title",
    focusBlockId: "block-brand",
    windowBlockIds: [
      "heading-prev",
      "item-expand",
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
    ],
    defaultExpandMode: "document_local_full",
    renderMode: "scroll",
  });
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
    windowBlockIds: ["block-official"],
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
    windowBlockIds: ["block-toolkit", "block-example", "block-after"],
    defaultExpandMode: "document_local_full",
    renderMode: "scroll",
  });
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
      "item-logo",
      "block-logo",
    ],
    renderMode: "document",
  });
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
  assert.equal(sourceWindow.startBlockId, "block-nearby");
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

test("buildBacklinkSourceWindow keeps list core mode focused on the list shell and focus child instead of the full subtree", () => {
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
    "item-logo",
    "block-logo",
  ]);
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
