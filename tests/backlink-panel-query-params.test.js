import test from "node:test";
import assert from "node:assert/strict";

import {
  applySavedPanelCriteria,
  clonePanelQueryParamsForSave,
  resetBacklinkQueryParameters,
  toggleRelatedDocumentCondition,
} from "../src/components/panel/backlink-panel-query-params.js";

function createQueryParams() {
  return {
    pageNum: 3,
    backlinkBlockSortMethod: "createdDesc",
    backlinkKeywordStr: "alpha beta",
    includeDocumentIds: new Set(["doc-a"]),
    excludeDocumentIds: new Set(["doc-b"]),
  };
}

test("resetBacklinkQueryParameters restores backlink defaults", () => {
  const queryParams = createQueryParams();
  const defaultQueryParams = {
    backlinkBlockSortMethod: "modifiedDesc",
  };

  resetBacklinkQueryParameters(queryParams, defaultQueryParams);

  assert.equal(queryParams.backlinkBlockSortMethod, "modifiedDesc");
  assert.equal(queryParams.backlinkKeywordStr, "");
  assert.deepEqual([...queryParams.includeDocumentIds], []);
  assert.deepEqual([...queryParams.excludeDocumentIds], []);
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
    backlinkBlockSortMethod: "alphabeticDesc",
    backlinkKeywordStr: "saved",
    includeDocumentIds: new Set(["saved-doc"]),
    excludeDocumentIds: new Set(["saved-doc-excluded"]),
  };

  applySavedPanelCriteria(queryParams, savedQueryParams);

  assert.equal(queryParams.pageNum, 1);
  assert.equal(queryParams.backlinkBlockSortMethod, "alphabeticDesc");
  assert.equal(queryParams.backlinkKeywordStr, "saved");
  assert.strictEqual(queryParams.includeDocumentIds, savedQueryParams.includeDocumentIds);
  assert.strictEqual(queryParams.excludeDocumentIds, savedQueryParams.excludeDocumentIds);
});

test("clonePanelQueryParamsForSave preserves current JSON-based snapshot behavior", () => {
  const queryParams = createQueryParams();

  const savedQueryParams = clonePanelQueryParamsForSave(queryParams);

  assert.equal(savedQueryParams.backlinkKeywordStr, "alpha beta");
  assert.deepEqual(savedQueryParams.includeDocumentIds, {});
});
