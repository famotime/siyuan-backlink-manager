import test from "node:test";
import assert from "node:assert/strict";

import {
  defBlockArraySort,
  defBlockArrayTypeAndKeywordFilter,
} from "../src/service/backlink/backlink-def-blocks.js";

test("defBlockArrayTypeAndKeywordFilter hides blocks without required anchor type or keyword match", () => {
  const blocks = [
    {
      id: "a",
      content: "Alpha block",
      name: "",
      alias: "",
      memo: "",
      dynamicAnchor: "alpha anchor",
      staticAnchor: "",
    },
    {
      id: "b",
      content: "Beta block",
      name: "",
      alias: "",
      memo: "",
      dynamicAnchor: "",
      staticAnchor: "beta anchor",
    },
  ];

  defBlockArrayTypeAndKeywordFilter(blocks, "dynamicAnchorText", "Alpha");
  assert.equal(blocks[0].filterStatus, false);
  assert.equal(blocks[1].filterStatus, true);

  defBlockArrayTypeAndKeywordFilter(blocks, "staticAnchorText", "missing");
  assert.equal(blocks[0].filterStatus, true);
  assert.equal(blocks[1].filterStatus, true);
});

test("defBlockArraySort keeps selected and excluded blocks ahead of optional blocks for ref-count sorting", async () => {
  const blocks = [
    {
      id: "optional",
      content: "Optional",
      refCount: 1,
      updated: "1",
      selectionStatus: "OPTIONAL",
    },
    {
      id: "excluded",
      content: "Excluded",
      refCount: 99,
      updated: "2",
      selectionStatus: "EXCLUDED",
    },
    {
      id: "selected",
      content: "Selected",
      refCount: 0,
      updated: "3",
      selectionStatus: "SELECTED",
    },
  ];

  await defBlockArraySort(blocks, "refCountDesc");

  assert.deepEqual(
    blocks.map((item) => item.id),
    ["selected", "excluded", "optional"],
  );
});

test("defBlockArraySort uses the injected block index lookup for content-based ordering", async () => {
  const blocks = [
    {
      id: "b",
      content: "Beta",
      refCount: 1,
      created: "1",
      sort: 0,
      selectionStatus: "OPTIONAL",
    },
    {
      id: "a",
      content: "Alpha",
      refCount: 1,
      created: "2",
      sort: 0,
      selectionStatus: "OPTIONAL",
    },
  ];

  await defBlockArraySort(blocks, "content", {
    getBatchBlockIdIndex: async () => new Map([["a", 1], ["b", 2]]),
  });

  assert.deepEqual(
    blocks.map((item) => item.id),
    ["a", "b"],
  );
});
