import test from "node:test";
import assert from "node:assert/strict";

import {
  paginateBacklinkBlocksByDocument,
} from "../src/service/backlink/backlink-document-pagination.js";

test("paginates backlink blocks by unique document count and keeps a document's backlinks on the same page", () => {
  const backlinkBlockNodeArray = [
    { block: { id: "a-1", root_id: "doc-a" } },
    { block: { id: "a-2", root_id: "doc-a" } },
    { block: { id: "b-1", root_id: "doc-b" } },
    { block: { id: "c-1", root_id: "doc-c" } },
    { block: { id: "c-2", root_id: "doc-c" } },
  ];

  const firstPage = paginateBacklinkBlocksByDocument(
    backlinkBlockNodeArray,
    1,
    2,
  );
  const secondPage = paginateBacklinkBlocksByDocument(
    backlinkBlockNodeArray,
    2,
    2,
  );

  assert.equal(firstPage.totalDocumentCount, 3);
  assert.equal(firstPage.totalPage, 2);
  assert.deepEqual(
    firstPage.pageBacklinkBlockArray.map((item) => item.block.id),
    ["a-1", "a-2", "b-1"],
  );
  assert.deepEqual(
    secondPage.pageBacklinkBlockArray.map((item) => item.block.id),
    ["c-1", "c-2"],
  );
});

test("clamps the page number using document-based pagination", () => {
  const backlinkBlockNodeArray = [
    { block: { id: "a-1", root_id: "doc-a" } },
    { block: { id: "b-1", root_id: "doc-b" } },
    { block: { id: "c-1", root_id: "doc-c" } },
  ];

  const page = paginateBacklinkBlocksByDocument(
    backlinkBlockNodeArray,
    99,
    2,
  );

  assert.equal(page.pageNum, 2);
  assert.equal(page.totalPage, 2);
  assert.deepEqual(
    page.pageBacklinkBlockArray.map((item) => item.block.id),
    ["c-1"],
  );
});
