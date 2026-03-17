const DEFAULT_BACKLINK_CONTEXT_BUDGET = {
  maxVisibleFragments: 6,
  maxVisibleChars: 240,
  maxDepth: 3,
  maxExpandedNodes: 12,
};

export function normalizeBacklinkContextBudget(budget = {}) {
  return {
    ...DEFAULT_BACKLINK_CONTEXT_BUDGET,
    ...(budget || {}),
  };
}

function getFragmentVisibleTextLength(fragment) {
  const text = String(
    fragment?.displayText || fragment?.text || fragment?.anchorText || "",
  )
    .replace(/\s+/g, " ")
    .trim();
  return text.length;
}

function compareBudgetFragments(a, b) {
  if (Boolean(a?.matched) !== Boolean(b?.matched)) {
    return a?.matched ? -1 : 1;
  }

  const priorityA = Number.isFinite(a?.budgetPriority) ? a.budgetPriority : 99;
  const priorityB = Number.isFinite(b?.budgetPriority) ? b.budgetPriority : 99;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  return (a?.order || 0) - (b?.order || 0);
}

export function applyBacklinkContextBudget(bundle, budget = {}) {
  const normalizedBudget = normalizeBacklinkContextBudget(budget);
  const explanationFragments = Array.isArray(bundle?.explanationFragments)
    ? [...bundle.explanationFragments]
    : Array.isArray(bundle?.visibleFragments)
      ? [...bundle.visibleFragments]
    : [];
  const prioritizedFragments = explanationFragments.sort(compareBudgetFragments);
  const keptFragments = [];
  let omittedFragmentCount = 0;
  let visibleCharacterCount = 0;
  let preservedMatchedFragmentCount = 0;

  for (const fragment of prioritizedFragments) {
    const fragmentLength = getFragmentVisibleTextLength(fragment);
    const exceedsFragmentBudget =
      keptFragments.length >= normalizedBudget.maxVisibleFragments;
    const exceedsCharBudget =
      keptFragments.length > 0 &&
      visibleCharacterCount + fragmentLength > normalizedBudget.maxVisibleChars;
    const mustKeep = fragment?.matched === true;
    const preserveCoreFragment = fragment?.budgetPriority === 1;

    if (
      (exceedsFragmentBudget || exceedsCharBudget) &&
      !mustKeep &&
      !preserveCoreFragment
    ) {
      omittedFragmentCount += 1;
      continue;
    }

    keptFragments.push(fragment);
    visibleCharacterCount += fragmentLength;
    if (mustKeep) {
      preservedMatchedFragmentCount += 1;
    }
  }

  keptFragments.sort((a, b) => (a?.order || 0) - (b?.order || 0));
  bundle.explanationFragments = keptFragments;
  bundle.visibleFragments = keptFragments;
  bundle.budgetSummary = {
    ...normalizedBudget,
    totalCandidateFragments: prioritizedFragments.length,
    omittedFragmentCount,
    preservedMatchedFragmentCount,
    visibleCharacterCount,
    truncated: omittedFragmentCount > 0,
  };
  return bundle;
}

export function applyBacklinkContextBudgetToNodes(
  backlinkBlockNodeArray = [],
  budget = {},
) {
  for (const backlinkBlockNode of backlinkBlockNodeArray) {
    if (!backlinkBlockNode?.contextBundle) {
      continue;
    }
    applyBacklinkContextBudget(backlinkBlockNode.contextBundle, budget);
  }
}
