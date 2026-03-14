import test from "node:test";
import assert from "node:assert/strict";

import {
  applyAnchorsToCurrentDocumentBlocks,
  attachDocumentBlocksToBacklinkNodes,
  buildBacklinkDocumentArray,
  buildRelatedDefBlockArray,
} from "../src/service/backlink/backlink-panel-base-data-builder.js";

test("applyAnchorsToCurrentDocumentBlocks fills dynamic and static anchors from aggregated maps", () => {
  const curDocDefBlockArray = [
    { id: "def-a", content: "A" },
    { id: "def-b", content: "B" },
  ];

  applyAnchorsToCurrentDocumentBlocks(
    curDocDefBlockArray,
    new Map([
      ["def-a", new Set(["dyn-1", "dyn-2"])],
    ]),
    new Map([
      ["def-b", new Set(["static-1"])],
    ]),
  );

  assert.equal(curDocDefBlockArray[0].dynamicAnchor, "dyn-1 dyn-2");
  assert.equal(curDocDefBlockArray[0].staticAnchor, "");
  assert.equal(curDocDefBlockArray[1].dynamicAnchor, "");
  assert.equal(curDocDefBlockArray[1].staticAnchor, "static-1");
});

test("buildRelatedDefBlockArray materializes block info, counts, timestamps, and anchors", () => {
  const result = buildRelatedDefBlockArray({
    relatedDefBlockCountMap: new Map([["def-a", 2]]),
    relatedDefBlockAndDocumentMap: new Map([
      [
        "def-a",
        {
          id: "def-a",
          content: "Alpha",
          created: "1",
          updated: "2",
        },
      ],
    ]),
    backlinkBlockCreatedMap: new Map([["def-a", "11"]]),
    backlinkBlockUpdatedMap: new Map([["def-a", "22"]]),
    relatedDefBlockDynamicAnchorMap: new Map([["def-a", new Set(["dyn"])]]),
    relatedDefBlockStaticAnchorMap: new Map([["def-a", new Set(["static"])]]),
  });

  assert.deepEqual(result, [
    {
      id: "def-a",
      content: "Alpha",
      created: "11",
      updated: "22",
      refCount: 2,
      selectionStatus: "OPTIONAL",
      dynamicAnchor: "dyn",
      staticAnchor: "static",
    },
  ]);
});

test("buildRelatedDefBlockArray keeps fallback blocks when metadata is missing but anchor text exists", () => {
  const result = buildRelatedDefBlockArray({
    relatedDefBlockCountMap: new Map([["missing", 1]]),
    relatedDefBlockAndDocumentMap: new Map(),
    backlinkBlockCreatedMap: new Map([["missing", "11"]]),
    backlinkBlockUpdatedMap: new Map([["missing", "22"]]),
    relatedDefBlockDynamicAnchorMap: new Map([["missing", new Set(["dyn-fallback"])]]),
    relatedDefBlockStaticAnchorMap: new Map(),
  });

  assert.deepEqual(result, [
    {
      id: "missing",
      content: "dyn-fallback",
      refCount: 1,
      created: "11",
      updated: "22",
      dynamicAnchor: "",
      staticAnchor: "",
      selectionStatus: "OPTIONAL",
    },
  ]);
});

test("buildBacklinkDocumentArray materializes source documents with counts and latest timestamps", () => {
  const result = buildBacklinkDocumentArray({
    backlinkDocumentCountMap: new Map([["doc-a", 3]]),
    relatedDefBlockAndDocumentMap: new Map([
      [
        "doc-a",
        {
          id: "doc-a",
          content: "Doc A",
          created: "1",
          updated: "2",
        },
      ],
    ]),
    backlinkBlockCreatedMap: new Map([["doc-a", "11"]]),
    backlinkBlockUpdatedMap: new Map([["doc-a", "22"]]),
  });

  assert.deepEqual(result, [
    {
      id: "doc-a",
      content: "Doc A",
      created: "11",
      updated: "22",
      refCount: 3,
      selectionStatus: "OPTIONAL",
    },
  ]);
});

test("attachDocumentBlocksToBacklinkNodes reuses looked-up document metadata for each backlink node", () => {
  const backlinkBlockMap = {
    a: { block: { root_id: "doc-a" }, documentBlock: null },
    b: { block: { root_id: "doc-b" }, documentBlock: null },
  };
  const blockInfoMap = new Map([
    ["doc-a", { id: "doc-a", content: "Doc A" }],
  ]);

  attachDocumentBlocksToBacklinkNodes(backlinkBlockMap, blockInfoMap);

  assert.deepEqual(backlinkBlockMap.a.documentBlock, {
    id: "doc-a",
    content: "Doc A",
  });
  assert.equal(backlinkBlockMap.b.documentBlock, undefined);
});
