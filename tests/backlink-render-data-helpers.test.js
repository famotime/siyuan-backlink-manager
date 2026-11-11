import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  extractNestedNodeDomById,
  getBacklinkNodeSortComparator,
  matchesBacklinkKeywords,
  normalizeTargetBacklinkDom,
  resolveBacklinkBlockNodeByContainer,
} from "../src/service/backlink/backlink-render-data-dom.js";

test("backlink render data delegates dom extraction helpers to a dedicated module", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-render-data.js", import.meta.url),
    "utf8",
  );

  // 只锁定生产代码实际使用的 dom helper 导入（extractNestedNodeDomById/normalizeTargetBacklinkDom
  // 在渲染数据模块中无调用方，不应出现在 import 列表中）
  assert.match(
    source,
    /import\s*\{[\s\S]*getBacklinkNodeSortComparator,[\s\S]*matchesBacklinkKeywords,[\s\S]*resolveBacklinkBlockNodeByContainer[\s\S]*\}\s*from "\.\/backlink-render-data-dom\.js";/,
  );
  assert.doesNotMatch(
    source,
    /import\s*\{[^}]*extractNestedNodeDomById/,
  );
  assert.doesNotMatch(
    source,
    /import\s*\{[^}]*normalizeTargetBacklinkDom/,
  );
});

test("extractNestedNodeDomById returns the nested block dom for a target node id", () => {
  const dom =
    "<div data-node-id='item-a'><div data-node-id='block-a'>Alpha</div><div data-node-id='block-b'>Beta</div></div>";

  assert.equal(
    extractNestedNodeDomById(dom, "block-b"),
    "<div data-node-id='block-b'>Beta</div>",
  );
});

test("normalizeTargetBacklinkDom falls back to nested extraction when custom extraction misses the nested block", () => {
  const dom =
    "<div data-node-id='item-a'><div data-node-id='block-a'>Alpha</div></div>";

  assert.equal(
    normalizeTargetBacklinkDom(dom, "block-a", {
      extractTargetBacklinkDom: () => "<div data-node-id='item-a'>Alpha</div>",
      getBacklinkBlockId: (value) => value.match(/data-node-id='([^']+)'/)?.[1] || "",
    }),
    "<div data-node-id='block-a'>Alpha</div>",
  );
});

test("resolveBacklinkBlockNodeByContainer maps container dom back to the nested backlink block when needed", () => {
  const backlinkBlockNode = {
    block: {
      id: "block-a",
    },
  };
  const result = resolveBacklinkBlockNodeByContainer({
    backlink: {
      dom: "<div data-node-id='item-a'><div data-node-id='block-a'>Alpha</div></div>",
    },
    backlinkBlockNodeMap: new Map(),
    backlinkBlockParentNodeMap: new Map([["item-a", [backlinkBlockNode]]]),
    getBacklinkBlockId: (value) => value.match(/data-node-id='([^']+)'/)?.[1] || "",
    extractTargetBacklinkDom: (dom, blockId) =>
      dom.match(new RegExp(`<div data-node-id='${blockId}'>[\\\\s\\\\S]*?</div>`))?.[0] || "",
  });

  assert.equal(result.backlinkBlockId, "block-a");
  assert.equal(result.backlinkBlockNode, backlinkBlockNode);
  assert.equal(result.normalizedDom, "<div data-node-id='block-a'>Alpha</div>");
});

test("matchesBacklinkKeywords validates text and anchor matches from prepared searchable content", () => {
  const result = matchesBacklinkKeywords({
    keywordObj: {
      includeText: ["alpha"],
      excludeText: ["gamma"],
      includeAnchor: ["skill"],
      excludeAnchor: [],
    },
    searchableText: "alpha beta",
    searchableAnchorText: "skill docs",
    matchKeywords: (content, includeText, excludeText) =>
      includeText.every((keyword) => content.includes(keyword)) &&
      excludeText.every((keyword) => !content.includes(keyword)),
  });

  assert.deepEqual(result, {
    matchText: true,
    matchAnchor: true,
  });
});

test("getBacklinkNodeSortComparator returns a document-title comparator for alphabetic document sort", () => {
  const comparator = getBacklinkNodeSortComparator("documentAlphabeticAsc", {
    getDefBlockSortFun: () => null,
  });

  const sorted = [
    {
      documentBlock: { content: "Beta" },
      block: { content: "b", created: "2" },
    },
    {
      documentBlock: { content: "Alpha" },
      block: { content: "a", created: "1" },
    },
  ].sort(comparator);

  assert.deepEqual(
    sorted.map((item) => item.documentBlock.content),
    ["Alpha", "Beta"],
  );
});
