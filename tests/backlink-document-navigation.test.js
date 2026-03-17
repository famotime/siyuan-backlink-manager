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

test("keeps document group order aligned with backlinkDocumentArray instead of first backlink occurrence", () => {
  const backlinkDocumentArray = [
    { id: "doc-b", content: "Beta" },
    { id: "doc-a", content: "Alpha" },
  ];
  const backlinkDataArray = [
    { backlinkBlock: { id: "a-1", root_id: "doc-a", content: "Alpha ref 1", box: "box-a" } },
    { backlinkBlock: { id: "b-1", root_id: "doc-b", content: "Beta ref 1", box: "box-b" } },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.deepEqual(
    groups.map((group) => group.documentId),
    ["doc-b", "doc-a"],
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

test("falls back to sourceDocumentOrder when block document order fields are unavailable", () => {
  const backlinkDocumentArray = [{ id: "doc-a", content: "Alpha" }];
  const backlinkDataArray = [
    {
      backlinkBlock: { id: "a-3", root_id: "doc-a", content: "Alpha ref 3", box: "box-a" },
      sourceDocumentOrder: 30,
    },
    {
      backlinkBlock: { id: "a-1", root_id: "doc-a", content: "Alpha ref 1", box: "box-a" },
      sourceDocumentOrder: 10,
    },
    {
      backlinkBlock: { id: "a-2", root_id: "doc-a", content: "Alpha ref 2", box: "box-a" },
      sourceDocumentOrder: 20,
    },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.deepEqual(
    groups[0].backlinks.map((backlink) => backlink.backlinkBlock.id),
    ["a-1", "a-2", "a-3"],
  );
  assert.equal(groups[0].activeBacklink.backlinkBlock.id, "a-1");
  assert.equal(getCyclicBacklinkIndex(groups[0].backlinks.length, groups[0].activeIndex, "next"), 1);
});

test("keeps sourceDocumentOrder ahead of block metadata order", () => {
  const backlinkDocumentArray = [{ id: "doc-a", content: "Alpha" }];
  const backlinkDataArray = [
    {
      backlinkBlock: {
        id: "a-3",
        root_id: "doc-a",
        content: "Alpha ref 3",
        box: "box-a",
        sort: 30,
        path: "/doc-a/3",
      },
      sourceDocumentOrder: 30,
    },
    {
      backlinkBlock: {
        id: "a-1",
        root_id: "doc-a",
        content: "Alpha ref 1",
        box: "box-a",
        sort: 10,
        path: "/doc-a/1",
      },
      sourceDocumentOrder: 10,
    },
    {
      backlinkBlock: {
        id: "a-2",
        root_id: "doc-a",
        content: "Alpha ref 2",
        box: "box-a",
        sort: 20,
        path: "/doc-a/2",
      },
      sourceDocumentOrder: 20,
    },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.deepEqual(
    groups[0].backlinks.map((backlink) => backlink.backlinkBlock.id),
    ["a-1", "a-2", "a-3"],
  );
  assert.equal(groups[0].activeBacklink.backlinkBlock.id, "a-1");
});

test("keeps original api order when sourceDocumentOrder is missing", () => {
  const backlinkDocumentArray = [{ id: "doc-a", content: "Alpha" }];
  const backlinkDataArray = [
    {
      backlinkBlock: {
        id: "a-3",
        root_id: "doc-a",
        content: "Alpha ref 3",
        box: "box-a",
        sort: 30,
        path: "/doc-a/3",
      },
    },
    {
      backlinkBlock: {
        id: "a-1",
        root_id: "doc-a",
        content: "Alpha ref 1",
        box: "box-a",
        sort: 10,
        path: "/doc-a/1",
      },
    },
    {
      backlinkBlock: {
        id: "a-2",
        root_id: "doc-a",
        content: "Alpha ref 2",
        box: "box-a",
        sort: 20,
        path: "/doc-a/2",
      },
    },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.deepEqual(
    groups[0].backlinks.map((backlink) => backlink.backlinkBlock.id),
    ["a-3", "a-1", "a-2"],
  );
  assert.equal(groups[0].activeBacklink.backlinkBlock.id, "a-3");
});

test("keeps original relative order when only part of a document group has sourceDocumentOrder", () => {
  const backlinkDocumentArray = [{ id: "doc-a", content: "Alpha" }];
  const backlinkDataArray = [
    {
      backlinkBlock: {
        id: "a-3",
        root_id: "doc-a",
        content: "Alpha ref 3",
        box: "box-a",
      },
    },
    {
      backlinkBlock: {
        id: "a-1",
        root_id: "doc-a",
        content: "Alpha ref 1",
        box: "box-a",
      },
      sourceDocumentOrder: 10,
    },
    {
      backlinkBlock: {
        id: "a-2",
        root_id: "doc-a",
        content: "Alpha ref 2",
        box: "box-a",
      },
    },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.deepEqual(
    groups[0].backlinks.map((backlink) => backlink.backlinkBlock.id),
    ["a-3", "a-1", "a-2"],
  );
  assert.equal(groups[0].activeBacklink.backlinkBlock.id, "a-3");
});

test("sorts heading backlinks by sourceDocumentOrder instead of heading metadata priority", () => {
  const backlinkDocumentArray = [{ id: "doc-a", content: "Alpha" }];
  const backlinkDataArray = [
    {
      backlinkBlock: {
        id: "heading-late",
        root_id: "doc-a",
        content: "## Late heading",
        box: "box-a",
        type: "h",
        sort: 1,
        path: "/doc-a/heading-late",
      },
      sourceDocumentOrder: 40,
    },
    {
      backlinkBlock: {
        id: "para-middle",
        root_id: "doc-a",
        content: "middle paragraph",
        box: "box-a",
        type: "p",
        sort: 999,
        path: "/doc-a/para-middle",
      },
      sourceDocumentOrder: 20,
    },
    {
      backlinkBlock: {
        id: "heading-early",
        root_id: "doc-a",
        content: "## Early heading",
        box: "box-a",
        type: "h",
        sort: 2,
        path: "/doc-a/heading-early",
      },
      sourceDocumentOrder: 10,
    },
  ];

  const groups = groupBacklinksByDocument(backlinkDocumentArray, backlinkDataArray);

  assert.deepEqual(
    groups[0].backlinks.map((backlink) => backlink.backlinkBlock.id),
    ["heading-early", "para-middle", "heading-late"],
  );
  assert.equal(groups[0].activeBacklink.backlinkBlock.id, "heading-early");
});
