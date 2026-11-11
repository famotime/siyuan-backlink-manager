import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeBacklinkKeywords,
} from "../src/components/panel/backlink-panel-formatting.js";

test("removes include and exclude prefixes from backlink keywords before highlighting", () => {
  assert.deepEqual(
    sanitizeBacklinkKeywords(["%foo", "-bar", "%-baz", "-%qux", "plain"]),
    ["foo", "bar", "baz", "qux", "plain"],
  );
});

