import test from "node:test";
import assert from "node:assert/strict";

import { buildBacklinkPanelData } from "../src/service/backlink/backlink-panel-data-assembly.js";

test("buildBacklinkPanelData forwards sibling groups and collector helpers to the sibling collector", async () => {
  let receivedArgs = null;

  await buildBacklinkPanelData(
    {
      rootId: "doc-current",
      curDocDefBlockArray: [],
      backlinkBlockArray: [],
      headlinkBacklinkChildBlockArray: [],
      listItemBacklinkChildBlockArray: [],
      backlinkParentBlockArray: [],
      backlinkSiblingBlockGroupArray: [
        {
          backlinkBlockId: "block-a",
          previousSiblingBlock: { id: "block-prev", markdown: "prev" },
          nextSiblingBlock: { id: "block-next", markdown: "next" },
        },
      ],
    },
    {
      getBlockIds: () => [],
      collectBacklinkBlocks: async () => {},
      collectHeadlineChildBlocks: () => {},
      collectListItemTreeNodes: () => {},
      collectParentBlocks: () => {},
      collectSiblingBlocks: (args) => {
        receivedArgs = args;
      },
      getBacklinkEmbedBlockInfo: async () => ({}),
      createBacklinkBlockNode: () => ({}),
      updateDynamicAnchorMap: () => {},
      updateStaticAnchorMap: () => {},
      getRefBlockId: () => [],
      updateMaxValueMap: () => {},
      updateMapCount: () => {},
      ListItemTreeNode: { buildTree: () => [] },
      isArrayNotEmpty: () => false,
      getBlockInfoMap: async () => new Map(),
      generateGetBlockArraySql: () => "",
      sql: async () => [],
      applyAnchorsToCurrentDocumentBlocks: () => {},
      buildRelatedDefBlockArray: () => [],
      buildBacklinkDocumentArray: () => [],
      attachDocumentBlocksToBacklinkNodes: () => {},
    },
  );

  assert.deepEqual(receivedArgs.backlinkSiblingBlockGroupArray, [
    {
      backlinkBlockId: "block-a",
      previousSiblingBlock: { id: "block-prev", markdown: "prev" },
      nextSiblingBlock: { id: "block-next", markdown: "next" },
    },
  ]);
  assert.equal(typeof receivedArgs.getRefBlockId, "function");
  assert.equal(typeof receivedArgs.updateDynamicAnchorMap, "function");
  assert.equal(typeof receivedArgs.updateStaticAnchorMap, "function");
});
