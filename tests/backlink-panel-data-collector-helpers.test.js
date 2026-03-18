import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  appendMarkdownSegment,
  prependMarkdownSegment,
  prependBlockId,
  trackRelatedDefBlockId,
  trackRelatedDefBlockIdWithoutDuplicates,
} from "../src/service/backlink/backlink-panel-data-collector-helpers.js";

test("panel data collectors delegate shared helper logic to a dedicated helper module", () => {
  const coreSource = readFileSync(
    new URL("../src/service/backlink/backlink-panel-data-collector-core.js", import.meta.url),
    "utf8",
  );
  const contextSource = readFileSync(
    new URL("../src/service/backlink/backlink-panel-data-collector-context.js", import.meta.url),
    "utf8",
  );

  assert.match(
    coreSource,
    /import\s*\{[\s\S]*trackRelatedDefBlockId,[\s\S]*trackRelatedDefBlockIdWithoutDuplicates[\s\S]*\}\s*from "\.\/backlink-panel-data-collector-helpers\.js";/,
  );
  assert.match(
    contextSource,
    /import\s*\{[\s\S]*appendMarkdownSegment,[\s\S]*trackRelatedDefBlockIdWithoutDuplicates[\s\S]*\}\s*from "\.\/backlink-panel-data-collector-helpers\.js";/,
  );
});

test("appendMarkdownSegment and prependMarkdownSegment keep blank-safe newline separation", () => {
  assert.equal(appendMarkdownSegment("", "alpha"), "alpha");
  assert.equal(appendMarkdownSegment("alpha", "beta"), "alpha\n\nbeta");
  assert.equal(prependMarkdownSegment("", "alpha"), "alpha");
  assert.equal(prependMarkdownSegment("beta", "alpha"), "alpha\n\nbeta");
});

test("prependBlockId keeps insertion order without duplicates", () => {
  assert.deepEqual(prependBlockId(["b"], "a"), ["a", "b"]);
  assert.deepEqual(prependBlockId(["a", "b"], "a"), ["a", "b"]);
});

test("trackRelatedDefBlockId updates direct and related counters by document ownership", () => {
  const backlinkBlockNode = {
    includeRelatedDefBlockIds: new Set(),
    includeCurBlockDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
  };
  const createdMap = new Map();
  const updatedMap = new Map();
  const countMap = new Map();

  trackRelatedDefBlockId({
    backlinkBlockNode,
    relatedDefBlockId: "def-related",
    curDocDefBlockIdArray: ["def-current"],
    created: "11",
    updated: "22",
    relatedDefBlockCountMap: countMap,
    backlinkBlockCreatedMap: createdMap,
    backlinkBlockUpdatedMap: updatedMap,
    updateMaxValueMap: (map, key, value) => map.set(key, value),
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
  });

  assert.ok(backlinkBlockNode.includeRelatedDefBlockIds.has("def-related"));
  assert.ok(backlinkBlockNode.includeCurBlockDefBlockIds.has("def-related"));
  assert.equal(countMap.get("def-related"), 1);
  assert.equal(createdMap.get("def-related"), "11");
  assert.equal(updatedMap.get("def-related"), "22");
});

test("trackRelatedDefBlockIdWithoutDuplicates skips counter updates for already-seen ids", () => {
  const backlinkBlockNode = {
    includeRelatedDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
  };
  const countMap = new Map();

  trackRelatedDefBlockIdWithoutDuplicates({
    backlinkBlockNode,
    relatedDefBlockId: "def-related",
    curDocDefBlockIdArray: [],
    relatedDefBlockIdSet: new Set(["def-related"]),
    created: "11",
    updated: "22",
    relatedDefBlockCountMap: countMap,
    backlinkBlockCreatedMap: new Map(),
    backlinkBlockUpdatedMap: new Map(),
    updateMaxValueMap: () => {},
    updateMapCount: (map, key, initialValue = 1) =>
      map.set(key, map.has(key) ? map.get(key) + 1 : initialValue),
  });

  assert.ok(backlinkBlockNode.includeRelatedDefBlockIds.has("def-related"));
  assert.equal(countMap.has("def-related"), false);
});
