import test from "node:test";
import assert from "node:assert/strict";

import {
  attachBacklinkSourceWindows,
  buildBacklinkSourceWindow,
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
  });
});

test("buildBacklinkSourceWindow falls back to document start and end when no headings exist", () => {
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

  assert.deepEqual(sourceWindow.windowBlockIds, [
    "intro",
    "item-brand",
    "block-brand",
    "tail",
  ]);
  assert.equal(sourceWindow.startBlockId, "intro");
  assert.equal(sourceWindow.endBlockId, "tail");
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
  });
});

test("buildBacklinkSourceWindow keeps nearby mode on sibling list items and includes the next parent item subtree", () => {
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
  });
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
