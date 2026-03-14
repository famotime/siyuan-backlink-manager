import test from "node:test";
import assert from "node:assert/strict";

import {
  formatBacklinkDocApiKeyword,
  getBatchBacklinkDoc,
} from "../src/service/backlink/backlink-render-data.js";

test("formatBacklinkDocApiKeyword keeps the longest segment and truncates it to 80 chars", () => {
  const longSegment = "x".repeat(100);

  assert.equal(formatBacklinkDocApiKeyword(`a'bigger'${longSegment}`), longSegment.slice(0, 80));
  assert.equal(formatBacklinkDocApiKeyword(""), "");
});

test("getBatchBacklinkDoc deduplicates backlink dom results and preserves backlink block order", async () => {
  const backlinkBlockNodeArray = [
    {
      block: { id: "block-a", parent_id: "parent-a", root_id: "doc-a", content: "Alpha" },
      includeCurBlockDefBlockIds: new Set(["def-a"]),
      includeDirectDefBlockIds: new Set(["def-a"]),
      parentListItemTreeNode: null,
    },
    {
      block: { id: "block-b", parent_id: "parent-b", root_id: "doc-b", content: "Beta" },
      includeCurBlockDefBlockIds: new Set(["def-b"]),
      includeDirectDefBlockIds: new Set(["def-b"]),
      parentListItemTreeNode: {
        includeChildIdArray: ["child-1"],
        excludeChildIdArray: ["child-2"],
      },
    },
  ];

  const result = await getBatchBacklinkDoc({
    curRootId: "current-doc",
    backlinkBlockNodeArray,
    deps: {
      intersectionSet: (setA, setB) => [...setA].filter((item) => setB.has(item)),
      longestCommonSubstring: (a) => a,
      getBacklinkDocByApiOrCache: async (_rootId, defId) => ({
        usedCache: defId === "def-a",
        backlinks:
          defId === "def-a"
            ? [
                { dom: "<div data-node-id='block-b'></div>" },
                { dom: "<div data-node-id='block-a'></div>" },
              ]
            : [
                { dom: "<div data-node-id='block-b'></div>" },
              ],
      }),
      getBacklinkBlockId: (dom) => dom.match(/data-node-id='([^']+)'/)[1],
      triggerIncompleteBacklinkFetch: () => {},
    },
  });

  assert.equal(result.usedCache, true);
  assert.deepEqual(
    result.backlinks.map((item) => item.backlinkBlock.id),
    ["block-a", "block-b"],
  );
  assert.deepEqual(result.backlinks[1].includeChildListItemIdArray, ["child-1"]);
  assert.deepEqual(result.backlinks[1].excludeChildLisetItemIdArray, ["child-2"]);
});
