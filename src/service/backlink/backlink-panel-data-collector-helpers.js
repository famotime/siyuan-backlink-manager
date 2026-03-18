export function trackRelatedDefBlockId({
  backlinkBlockNode,
  relatedDefBlockId,
  curDocDefBlockIdArray,
  created,
  updated,
  relatedDefBlockCountMap,
  backlinkBlockCreatedMap,
  backlinkBlockUpdatedMap,
  updateMaxValueMap,
  updateMapCount,
}) {
  backlinkBlockNode.includeRelatedDefBlockIds.add(relatedDefBlockId);
  backlinkBlockNode.includeCurBlockDefBlockIds?.add?.(relatedDefBlockId);

  if (curDocDefBlockIdArray.includes(relatedDefBlockId)) {
    backlinkBlockNode.includeDirectDefBlockIds.add(relatedDefBlockId);
    return;
  }

  updateMaxValueMap(backlinkBlockCreatedMap, relatedDefBlockId, created);
  updateMaxValueMap(backlinkBlockUpdatedMap, relatedDefBlockId, updated);
  updateMapCount(relatedDefBlockCountMap, relatedDefBlockId);
}

export function trackRelatedDefBlockIdWithoutDuplicates({
  backlinkBlockNode,
  relatedDefBlockId,
  curDocDefBlockIdArray,
  relatedDefBlockIdSet,
  created,
  updated,
  relatedDefBlockCountMap,
  backlinkBlockCreatedMap,
  backlinkBlockUpdatedMap,
  updateMaxValueMap,
  updateMapCount,
}) {
  backlinkBlockNode.includeRelatedDefBlockIds.add(relatedDefBlockId);

  if (curDocDefBlockIdArray.includes(relatedDefBlockId)) {
    backlinkBlockNode.includeDirectDefBlockIds.add(relatedDefBlockId);
    return;
  }

  if (relatedDefBlockIdSet.has(relatedDefBlockId)) {
    return;
  }

  updateMaxValueMap(backlinkBlockCreatedMap, relatedDefBlockId, created);
  updateMaxValueMap(backlinkBlockUpdatedMap, relatedDefBlockId, updated);
  updateMapCount(relatedDefBlockCountMap, relatedDefBlockId);
}

export function appendMarkdownSegment(baseMarkdown = "", nextMarkdown = "") {
  const compactNextMarkdown = String(nextMarkdown || "").trim();
  if (!compactNextMarkdown) {
    return baseMarkdown || "";
  }
  if (!baseMarkdown) {
    return compactNextMarkdown;
  }
  return `${baseMarkdown}\n\n${compactNextMarkdown}`;
}

export function prependMarkdownSegment(baseMarkdown = "", nextMarkdown = "") {
  const compactNextMarkdown = String(nextMarkdown || "").trim();
  if (!compactNextMarkdown) {
    return baseMarkdown || "";
  }
  if (!baseMarkdown) {
    return compactNextMarkdown;
  }
  return `${compactNextMarkdown}\n\n${baseMarkdown}`;
}

export function prependBlockId(blockIdArray = [], blockId = "") {
  if (!blockId) {
    return Array.isArray(blockIdArray) ? blockIdArray : [];
  }

  const nextBlockIdArray = Array.isArray(blockIdArray) ? [...blockIdArray] : [];
  if (!nextBlockIdArray.includes(blockId)) {
    nextBlockIdArray.unshift(blockId);
  }
  return nextBlockIdArray;
}
