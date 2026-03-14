import test from "node:test";
import assert from "node:assert/strict";

import {
  getCyclicBacklinkIndex,
  groupBacklinksByDocument,
} from "../src/components/panel/backlink-document-navigation.js";

test("groups backlinks by document and defaults to the first backlink in each group", () => {
  const backlinkDocumentArray = [
    { id: "doc-a", content: "Alpha" },
    { id: "doc-b", content: "Beta" },
  ];
  const backlinkDataArray = [
    { backlinkBlock: { id: "a-1", root_id: "doc-a", content: "Alpha ref 1", box: "box-a" } },
    { backlinkBlock: { id: "a-2", root_id: "doc-a", content: "Alpha ref 2", box: "box-a" } },
    { backlinkBlock: { id: "b-1", root_id: "doc-b", content: "Beta ref 1", box: "box-b" } },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => ({
      documentId: group.documentId,
      activeBacklinkId: group.activeBacklink.backlinkBlock.id,
      progressText: group.progressText,
    })),
    [
      { documentId: "doc-a", activeBacklinkId: "a-1", progressText: "1/2" },
      { documentId: "doc-b", activeBacklinkId: "b-1", progressText: "1/1" },
    ],
  );
});

test("uses saved active indexes when rebuilding document groups", () => {
  const backlinkDocumentArray = [{ id: "doc-a", content: "Alpha" }];
  const backlinkDataArray = [
    { backlinkBlock: { id: "a-1", root_id: "doc-a", content: "Alpha ref 1", box: "box-a" } },
    { backlinkBlock: { id: "a-2", root_id: "doc-a", content: "Alpha ref 2", box: "box-a" } },
    { backlinkBlock: { id: "a-3", root_id: "doc-a", content: "Alpha ref 3", box: "box-a" } },
  ];

  const groups = groupBacklinksByDocument(
    backlinkDocumentArray,
    backlinkDataArray,
    new Map([["doc-a", 1]]),
  );

  assert.equal(groups[0].activeBacklink.backlinkBlock.id, "a-2");
  assert.equal(groups[0].progressText, "2/3");
});

test("cycles next and previous navigation indexes within a document group", () => {
  assert.equal(getCyclicBacklinkIndex(3, 0, "next"), 1);
  assert.equal(getCyclicBacklinkIndex(3, 2, "next"), 0);
  assert.equal(getCyclicBacklinkIndex(3, 0, "previous"), 2);
  assert.equal(getCyclicBacklinkIndex(1, 0, "next"), 0);
});
