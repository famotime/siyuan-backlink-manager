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

test("buildBacklinkSourceWindow expands extended mode to a document-local window around heading ancestors and list siblings", () => {
  const orderedBlocks = createDocumentBlocks([
    { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
    { id: "heading-h3", type: "h", subtype: "h3", parent_id: "doc-a" },
    { id: "item-expand", type: "i", parent_id: "list-root" },
    { id: "item-nearby", type: "i", parent_id: "list-root" },
    { id: "item-brand", type: "i", parent_id: "list-root" },
    { id: "block-brand", type: "p", parent_id: "item-brand" },
    { id: "item-title", type: "i", parent_id: "list-root" },
    { id: "item-logo", type: "i", parent_id: "list-root" },
    { id: "item-error", type: "i", parent_id: "list-root" },
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
      parentContextBlockIds: ["heading-h2", "heading-h3"],
      parentListItemTreeNode: {
        id: "item-brand",
        children: [],
      },
      previousSiblingBlockId: "item-nearby",
      nextSiblingBlockId: "item-title",
      beforeExpandedBlockIdArray: ["item-expand"],
      afterExpandedBlockIdArray: ["item-logo", "item-error"],
    },
    orderedDocumentBlocks: orderedBlocks,
    contextVisibilityLevel: "extended",
  });

  assert.deepEqual(sourceWindow, {
    rootId: "doc-a",
    anchorBlockId: "block-brand",
    startBlockId: "heading-h2",
    endBlockId: "item-error",
    focusBlockId: "block-brand",
    windowBlockIds: [
      "heading-h2",
      "heading-h3",
      "item-expand",
      "item-nearby",
      "item-brand",
      "block-brand",
      "item-title",
      "item-logo",
      "item-error",
    ],
    defaultExpandMode: "document_local_full",
  });
});

test("attachBacklinkSourceWindows adds a source window to extended backlinks without disturbing nearby mode items", () => {
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
        { id: "heading-h2", type: "h", subtype: "h2", parent_id: "doc-a" },
        { id: "item-nearby", type: "i", parent_id: "list-root" },
        { id: "item-brand", type: "i", parent_id: "list-root" },
        { id: "block-brand", type: "p", parent_id: "item-brand" },
        { id: "item-title", type: "i", parent_id: "list-root" },
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
  assert.equal(backlinks[1].sourceWindow.focusBlockId, "block-nearby");
});
