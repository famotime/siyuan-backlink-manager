import test from "node:test";
import assert from "node:assert/strict";

import {
  resetBacklinkQueryParameters,
} from "../src/components/panel/backlink-panel-query-params.js";

test("resetBacklinkQueryParameters restores backlink defaults", () => {
  const queryParams = {
    backlinkBlockSortMethod: "createdAsc",
    backlinkKeywordStr: "keyword",
    includeDocumentIds: new Set(["doc-a"]),
    excludeDocumentIds: new Set(["doc-b"]),
    pageNum: 3,
  };
  const defaultQueryParams = {
    backlinkBlockSortMethod: "modifiedDesc",
    backlinkKeywordStr: "",
    includeDocumentIds: new Set(),
    excludeDocumentIds: new Set(),
  };

  const result = resetBacklinkQueryParameters(queryParams, defaultQueryParams);

  assert.equal(result.backlinkBlockSortMethod, "modifiedDesc");
  assert.equal(result.backlinkKeywordStr, "");
  assert.equal(result.includeDocumentIds.size, 0);
  assert.equal(result.excludeDocumentIds.size, 0);
});
