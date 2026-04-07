import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBacklinkPanelRenderDataResult,
  buildValidBacklinkRenderNodes,
} from "../src/service/backlink/backlink-data-pipeline.js";

test("backlink data module fetches every filtered backlink document in a single render pass", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-data.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /paginateBacklinkBlocksByDocument/);
  assert.match(
    source,
    /buildBacklinkFetchStageResult\(\{\s*[\s\S]*rootId,\s*[\s\S]*pageBacklinkBlockArray:\s*validBacklinkBlockNodeArray,/,
  );
});

test("backlink data module delegates render-node preparation and render-payload assembly to pipeline helpers", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-data.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[\s\S]*buildBacklinkPanelRenderDataResult,[\s\S]*buildValidBacklinkRenderNodes[\s\S]*\}\s*from "\.\/backlink-data-pipeline\.js";/,
  );
  assert.match(
    source,
    /const validBacklinkBlockNodeArray(?::[\s\S]*?)? = buildValidBacklinkRenderNodes\(\s*\{[\s\S]*backlinkBlockNodeArray,[\s\S]*queryParams,[\s\S]*\}\s*\);/,
  );
  assert.match(
    source,
    /const backlinkPanelRenderDataResult(?::[\s\S]*?)? = buildBacklinkPanelRenderDataResult\(\s*\{[\s\S]*rootId,[\s\S]*backlinkDataArray,[\s\S]*pagination,[\s\S]*usedCache,[\s\S]*\}\s*\);/,
  );
});

test("buildValidBacklinkRenderNodes applies validation, sorting, visibility, and budget stages in order", () => {
  const callOrder = [];
  const nodeArray = [
    { block: { id: "block-b" } },
    { block: { id: "block-a" } },
  ];

  const result = buildValidBacklinkRenderNodes({
    backlinkBlockNodeArray: nodeArray,
    queryParams: {
      backlinkBlockSortMethod: "createdDesc",
      backlinkContextVisibilityLevel: "extended",
    },
    contextBudget: { maxVisibleFragments: 3 },
    deps: {
      isBacklinkBlockValid: (_queryParams, node) => {
        callOrder.push(`validate:${node.block.id}`);
        return node.block.id !== "block-b";
      },
      backlinkBlockNodeArraySort: (validNodeArray, sortMethod) => {
        callOrder.push(`sort:${sortMethod}:${validNodeArray.length}`);
      },
      applyBacklinkContextVisibilityToNodes: (validNodeArray, visibilityLevel) => {
        callOrder.push(`visibility:${visibilityLevel}:${validNodeArray.length}`);
      },
      applyBacklinkContextBudgetToNodes: (validNodeArray, budget) => {
        callOrder.push(`budget:${budget.maxVisibleFragments}:${validNodeArray.length}`);
      },
    },
  });

  assert.deepEqual(result, [{ block: { id: "block-a" } }]);
  assert.deepEqual(callOrder, [
    "validate:block-b",
    "validate:block-a",
    "sort:createdDesc:1",
    "visibility:extended:1",
    "budget:3:1",
  ]);
});

test("buildBacklinkPanelRenderDataResult assembles a stable render payload shape", () => {
  const result = buildBacklinkPanelRenderDataResult({
    rootId: "doc-a",
    backlinkDataArray: [{ backlinkBlock: { id: "block-a" } }],
    pagination: {
      totalDocumentCount: 2,
      pageNum: 1,
      totalPage: 3,
    },
    validBacklinkBlockNodeArray: [{ block: { id: "node-a" } }],
    filterCurDocDefBlockArray: [{ id: "def-a" }],
    filterRelatedDefBlockArray: [{ id: "rel-a" }],
    filterBacklinkDocumentArray: [{ id: "doc-a" }],
    pageSize: 20,
    usedCache: true,
  });

  assert.deepEqual(result, {
    rootId: "doc-a",
    backlinkDataArray: [{ backlinkBlock: { id: "block-a" } }],
    backlinkDocumentCount: 2,
    backlinkBlockNodeArray: [{ block: { id: "node-a" } }],
    curDocDefBlockArray: [{ id: "def-a" }],
    relatedDefBlockArray: [{ id: "rel-a" }],
    backlinkDocumentArray: [{ id: "doc-a" }],
    pageNum: 1,
    pageSize: 20,
    totalPage: 3,
    usedCache: true,
  });
});
