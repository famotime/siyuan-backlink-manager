import test from "node:test";
import assert from "node:assert/strict";

import {
  getMarkdownAnchorTextArray,
  getRefBlockId,
  parseSearchSyntax,
  removeMarkdownRefBlockStyle,
} from "../src/service/backlink/backlink-markdown.js";

test("getRefBlockId extracts referenced block ids from single and double quoted refs", () => {
  const markdown =
    "((20240101010101-abcdefg 'Alpha')) and ((20240101010102-bcdefgh \"Beta\"))";

  assert.deepEqual(getRefBlockId(markdown), [
    "20240101010101-abcdefg",
    "20240101010102-bcdefgh",
  ]);
});

test("getMarkdownAnchorTextArray collects anchor text from block refs", () => {
  const markdown =
    "((20240101010101-abcdefg 'Alpha')) ((20240101010102-bcdefgh \"Beta\"))";

  assert.deepEqual(getMarkdownAnchorTextArray(markdown), ["Alpha", "Beta"]);
});

test("removeMarkdownRefBlockStyle keeps only anchor text content", () => {
  const markdown = "Prefix ((20240101010101-abcdefg 'Alpha')) suffix";

  assert.equal(removeMarkdownRefBlockStyle(markdown), "Prefix Alpha suffix");
});

test("parseSearchSyntax separates include and exclude terms for text and anchors", () => {
  assert.deepEqual(parseSearchSyntax("alpha -beta %anchor %-other"), {
    includeText: ["alpha"],
    excludeText: ["beta"],
    includeAnchor: ["anchor"],
    excludeAnchor: ["other"],
  });
});
