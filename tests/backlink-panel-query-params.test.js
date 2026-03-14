import test from "node:test";
import assert from "node:assert/strict";

import {
  applySavedPanelCriteria,
  clonePanelQueryParamsForSave,
  resetBacklinkQueryParameters,
  resetFilterQueryParameters,
  toggleRelatedDefBlockCondition,
  toggleRelatedDocumentCondition,
} from "../src/components/panel/backlink-panel-query-params.js";

function createQueryParams() {
  return {
    pageNum: 3,
    backlinkCurDocDefBlockType: "dynamicAnchorText",
    backlinkBlockSortMethod: "createdDesc",
    backlinkKeywordStr: "alpha beta",
    includeRelatedDefBlockIds: new Set(["def-a"]),
    excludeRelatedDefBlockIds: new Set(["def-b"]),
    includeDocumentIds: new Set(["doc-a"]),
    excludeDocumentIds: new Set(["doc-b"]),
    filterPanelCurDocDefBlockSortMethod: "content",
    filterPanelCurDocDefBlockKeywords: "current",
    filterPanelRelatedDefBlockType: "staticAnchorText",
    filterPanelRelatedDefBlockSortMethod: "refCountDesc",
    filterPanelRelatedDefBlockKeywords: "related",
    filterPanelBacklinkDocumentSortMethod: "alphabeticAsc",
    filterPanelBacklinkDocumentKeywords: "document",
  };
}

test("resetFilterQueryParameters restores filter-panel defaults and clears selection sets", () => {
  const queryParams = createQueryParams();
  const defaultQueryParams = {
    filterPanelCurDocDefBlockSortMethod: "type",
    filterPanelRelatedDefBlockType: "",
    filterPanelRelatedDefBlockSortMethod: "modifiedDesc",
    filterPanelBacklinkDocumentSortMethod: "createdDesc",
  };

  resetFilterQueryParameters(queryParams, defaultQueryParams);

  assert.equal(queryParams.filterPanelCurDocDefBlockSortMethod, "type");
  assert.equal(queryParams.filterPanelCurDocDefBlockKeywords, "");
  assert.equal(queryParams.filterPanelRelatedDefBlockType, "");
  assert.equal(queryParams.filterPanelRelatedDefBlockSortMethod, "modifiedDesc");
  assert.equal(queryParams.filterPanelRelatedDefBlockKeywords, "");
  assert.equal(queryParams.filterPanelBacklinkDocumentSortMethod, "createdDesc");
  assert.equal(queryParams.filterPanelBacklinkDocumentKeywords, "");
  assert.deepEqual([...queryParams.includeRelatedDefBlockIds], []);
  assert.deepEqual([...queryParams.excludeRelatedDefBlockIds], []);
  assert.deepEqual([...queryParams.includeDocumentIds], []);
  assert.deepEqual([...queryParams.excludeDocumentIds], []);
});

test("resetBacklinkQueryParameters restores backlink defaults without touching filter-panel fields", () => {
  const queryParams = createQueryParams();
  const defaultQueryParams = {
    backlinkCurDocDefBlockType: "",
    backlinkBlockSortMethod: "modifiedDesc",
  };

  resetBacklinkQueryParameters(queryParams, defaultQueryParams);

  assert.equal(queryParams.backlinkCurDocDefBlockType, "");
  assert.equal(queryParams.backlinkBlockSortMethod, "modifiedDesc");
  assert.equal(queryParams.backlinkKeywordStr, "");
  assert.equal(queryParams.filterPanelRelatedDefBlockKeywords, "related");
});

test("toggleRelatedDefBlockCondition recovers existing state before adding a new include or exclude condition", () => {
  const queryParams = createQueryParams();

  toggleRelatedDefBlockCondition(queryParams, "def-a", "include");
  assert.deepEqual([...queryParams.includeRelatedDefBlockIds], []);

  toggleRelatedDefBlockCondition(queryParams, "def-c", "exclude");
  assert.deepEqual([...queryParams.excludeRelatedDefBlockIds], ["def-b", "def-c"]);
});

test("toggleRelatedDocumentCondition mirrors document include and exclude toggling", () => {
  const queryParams = createQueryParams();

  toggleRelatedDocumentCondition(queryParams, "doc-b", "exclude");
  assert.deepEqual([...queryParams.excludeDocumentIds], []);

  toggleRelatedDocumentCondition(queryParams, "doc-c", "include");
  assert.deepEqual([...queryParams.includeDocumentIds], ["doc-a", "doc-c"]);
});

test("applySavedPanelCriteria restores saved criteria and resets the page number", () => {
  const queryParams = createQueryParams();
  const savedQueryParams = {
    backlinkCurDocDefBlockType: "staticAnchorText",
    backlinkBlockSortMethod: "alphabeticDesc",
    backlinkKeywordStr: "saved",
    includeRelatedDefBlockIds: new Set(["saved-def"]),
    excludeRelatedDefBlockIds: new Set(["saved-def-excluded"]),
    includeDocumentIds: new Set(["saved-doc"]),
    excludeDocumentIds: new Set(["saved-doc-excluded"]),
    filterPanelCurDocDefBlockSortMethod: "createdAsc",
    filterPanelCurDocDefBlockKeywords: "saved-current",
    filterPanelRelatedDefBlockType: "dynamicAnchorText",
    filterPanelRelatedDefBlockSortMethod: "typeAndContent",
    filterPanelRelatedDefBlockKeywords: "saved-related",
    filterPanelBacklinkDocumentSortMethod: "refCountAsc",
    filterPanelBacklinkDocumentKeywords: "saved-document",
  };

  applySavedPanelCriteria(queryParams, savedQueryParams);

  assert.equal(queryParams.pageNum, 1);
  assert.equal(queryParams.backlinkCurDocDefBlockType, "staticAnchorText");
  assert.equal(queryParams.backlinkBlockSortMethod, "alphabeticDesc");
  assert.equal(queryParams.backlinkKeywordStr, "saved");
  assert.equal(queryParams.filterPanelCurDocDefBlockKeywords, "saved-current");
  assert.equal(queryParams.filterPanelRelatedDefBlockType, "dynamicAnchorText");
  assert.equal(queryParams.filterPanelBacklinkDocumentKeywords, "saved-document");
  assert.strictEqual(
    queryParams.includeRelatedDefBlockIds,
    savedQueryParams.includeRelatedDefBlockIds,
  );
  assert.strictEqual(queryParams.includeDocumentIds, savedQueryParams.includeDocumentIds);
});

test("clonePanelQueryParamsForSave preserves current JSON-based snapshot behavior", () => {
  const queryParams = createQueryParams();

  const savedQueryParams = clonePanelQueryParamsForSave(queryParams);

  assert.equal(savedQueryParams.backlinkKeywordStr, "alpha beta");
  assert.deepEqual(savedQueryParams.includeRelatedDefBlockIds, {});
  assert.deepEqual(savedQueryParams.includeDocumentIds, {});
});
