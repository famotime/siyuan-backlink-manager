import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBacklinkContextBudget,
  applyBacklinkContextBudgetToNodes,
  normalizeBacklinkContextBudget,
} from "../src/service/backlink/backlink-context-budget.js";

test("normalizeBacklinkContextBudget fills default limits", () => {
  assert.deepEqual(normalizeBacklinkContextBudget(), {
    maxVisibleFragments: 6,
    maxVisibleChars: 240,
    maxDepth: 3,
    maxExpandedNodes: 12,
  });
  assert.deepEqual(normalizeBacklinkContextBudget({ maxVisibleChars: 100 }), {
    maxVisibleFragments: 6,
    maxVisibleChars: 100,
    maxDepth: 3,
    maxExpandedNodes: 12,
  });
});

test("applyBacklinkContextBudget keeps matched fragments before non-matched fragments", () => {
  const bundle = {
    visibleFragments: [
      {
        id: "doc",
        sourceType: "document",
        matched: false,
        budgetPriority: 2,
        order: 1,
        displayText: "document",
      },
      {
        id: "parent",
        sourceType: "parent",
        matched: true,
        budgetPriority: 3,
        order: 2,
        displayText: "matched-parent",
      },
      {
        id: "child",
        sourceType: "child_headline",
        matched: false,
        budgetPriority: 4,
        order: 3,
        displayText: "child",
      },
    ],
  };

  applyBacklinkContextBudget(bundle, {
    maxVisibleFragments: 2,
    maxVisibleChars: 30,
  });

  assert.deepEqual(
    bundle.visibleFragments.map((fragment) => fragment.id),
    ["doc", "parent"],
  );
  assert.equal(bundle.budgetSummary.omittedFragmentCount, 1);
  assert.equal(bundle.budgetSummary.preservedMatchedFragmentCount, 1);
});

test("applyBacklinkContextBudget preserves matched fragments even when the char budget is exceeded", () => {
  const bundle = {
    visibleFragments: [
      {
        id: "self",
        sourceType: "self",
        matched: false,
        budgetPriority: 1,
        order: 0,
        displayText: "short",
      },
      {
        id: "matched",
        sourceType: "parent",
        matched: true,
        budgetPriority: 3,
        order: 1,
        displayText: "this matched fragment is intentionally long",
      },
      {
        id: "sibling",
        sourceType: "sibling_prev",
        matched: false,
        budgetPriority: 3,
        order: 2,
        displayText: "other",
      },
    ],
  };

  applyBacklinkContextBudget(bundle, {
    maxVisibleFragments: 2,
    maxVisibleChars: 10,
  });

  assert.deepEqual(
    bundle.visibleFragments.map((fragment) => fragment.id),
    ["self", "matched"],
  );
  assert.equal(bundle.budgetSummary.truncated, true);
});

test("applyBacklinkContextBudgetToNodes updates every node bundle in place", () => {
  const backlinkBlockNodeArray = [
    {
      contextBundle: {
        visibleFragments: [
          {
            id: "self",
            matched: false,
            budgetPriority: 1,
            order: 0,
            displayText: "self",
          },
          {
            id: "matched",
            matched: true,
            budgetPriority: 3,
            order: 1,
            displayText: "matched fragment",
          },
          {
            id: "sibling",
            matched: false,
            budgetPriority: 3,
            order: 2,
            displayText: "other fragment",
          },
        ],
      },
    },
  ];

  applyBacklinkContextBudgetToNodes(backlinkBlockNodeArray, {
    maxVisibleFragments: 2,
    maxVisibleChars: 20,
  });

  assert.deepEqual(
    backlinkBlockNodeArray[0].contextBundle.visibleFragments.map(
      (fragment) => fragment.id,
    ),
    ["self", "matched"],
  );
  assert.equal(
    backlinkBlockNodeArray[0].contextBundle.budgetSummary.omittedFragmentCount,
    1,
  );
});
