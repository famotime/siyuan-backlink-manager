const DefinitionBlockStatus = {
  SELECTED: "SELECTED",
  EXCLUDED: "EXCLUDED",
  OPTIONAL: "OPTIONAL",
};

function getBlockIds(blockList = []) {
  return blockList.map((item) => item.id);
}

function formatDefBlockMap(defBlockArray = []) {
  const map = new Map();
  for (const defBlock of defBlockArray) {
    map.set(defBlock.id, defBlock);
  }
  return map;
}

function updateMapCount(map, key, initialValue = 1) {
  if (!map.has(key)) {
    map.set(key, initialValue);
    return;
  }

  map.set(key, map.get(key) + 1);
}

export function sanitizeBacklinkRenderQueryParams(queryParams, backlinkPanelData) {
  const invalidDefBlockId = new Set();
  const invalidDocumentId = new Set();
  const relatedDefBlockIds = getBlockIds([
    ...backlinkPanelData.curDocDefBlockArray,
    ...backlinkPanelData.relatedDefBlockArray,
  ]);
  const backlinkDocumentIds = getBlockIds(backlinkPanelData.backlinkDocumentArray);

  if (!(queryParams.includeRelatedDefBlockIds instanceof Set)) {
    queryParams.includeRelatedDefBlockIds = new Set();
  }
  for (const defBlockId of queryParams.includeRelatedDefBlockIds) {
    if (!relatedDefBlockIds.includes(defBlockId)) {
      invalidDefBlockId.add(defBlockId);
    }
  }

  if (!(queryParams.excludeRelatedDefBlockIds instanceof Set)) {
    queryParams.excludeRelatedDefBlockIds = new Set();
  }
  for (const defBlockId of queryParams.excludeRelatedDefBlockIds) {
    if (!relatedDefBlockIds.includes(defBlockId)) {
      invalidDefBlockId.add(defBlockId);
    }
  }

  if (!(queryParams.includeDocumentIds instanceof Set)) {
    queryParams.includeDocumentIds = new Set();
  }
  for (const documentId of queryParams.includeDocumentIds) {
    if (!backlinkDocumentIds.includes(documentId)) {
      invalidDocumentId.add(documentId);
    }
  }

  if (!(queryParams.excludeDocumentIds instanceof Set)) {
    queryParams.excludeDocumentIds = new Set();
  }
  for (const documentId of queryParams.excludeDocumentIds) {
    if (!backlinkDocumentIds.includes(documentId)) {
      invalidDocumentId.add(documentId);
    }
  }

  for (const blockId of invalidDefBlockId) {
    queryParams.includeRelatedDefBlockIds.delete(blockId);
    queryParams.excludeRelatedDefBlockIds.delete(blockId);
  }

  for (const blockId of invalidDocumentId) {
    queryParams.includeDocumentIds.delete(blockId);
    queryParams.excludeDocumentIds.delete(blockId);
  }

  for (const node of backlinkPanelData.backlinkBlockNodeArray || []) {
    if (node.parentListItemTreeNode) {
      node.parentListItemTreeNode.includeChildIdArray = null;
      node.parentListItemTreeNode.excludeChildIdArray = null;
    }
  }
}

export function filterExistingDefBlocks(
  existingDefBlockArray = [],
  validBacklinkBlockNodeArray = [],
  queryParams = {},
) {
  const existingDefBlockIdMap = formatDefBlockMap(existingDefBlockArray);
  const validDefBlockIdSet = new Set();
  const validDefBlockCountMap = new Map();
  const includeRelatedDefBlockIds = queryParams.includeRelatedDefBlockIds || new Set();
  const excludeRelatedDefBlockIds = queryParams.excludeRelatedDefBlockIds || new Set();

  for (const backlinkBlockNode of validBacklinkBlockNodeArray) {
    const verifyRelateDefBlockIds = backlinkBlockNode.includeRelatedDefBlockIds;
    const parentListItemTreeNode = backlinkBlockNode.parentListItemTreeNode;

    if (parentListItemTreeNode) {
      verifyRelateDefBlockIds.clear();
      backlinkBlockNode.includeCurBlockDefBlockIds.forEach((defBlockId) =>
        verifyRelateDefBlockIds.add(defBlockId),
      );
      backlinkBlockNode.includeParentDefBlockIds.forEach((defBlockId) =>
        verifyRelateDefBlockIds.add(defBlockId),
      );
      const listItemDefBlockIdArray = parentListItemTreeNode.getFilterDefBlockIds(
        parentListItemTreeNode.includeChildIdArray,
        parentListItemTreeNode.excludeChildIdArray,
      );
      listItemDefBlockIdArray.forEach((defBlockId) =>
        verifyRelateDefBlockIds.add(defBlockId),
      );
    }

    for (const blockId of verifyRelateDefBlockIds) {
      if (!existingDefBlockIdMap.has(blockId)) {
        continue;
      }
      updateMapCount(validDefBlockCountMap, blockId);
      validDefBlockIdSet.add(blockId);
    }
  }

  for (const defBlockId of includeRelatedDefBlockIds) {
    if (existingDefBlockIdMap.has(defBlockId)) {
      validDefBlockIdSet.add(defBlockId);
    }
  }

  for (const defBlockId of excludeRelatedDefBlockIds) {
    if (existingDefBlockIdMap.has(defBlockId)) {
      validDefBlockIdSet.add(defBlockId);
    }
  }

  const validDefBlockArray = [];
  for (const blockId of validDefBlockIdSet) {
    const defBlock = existingDefBlockIdMap.get(blockId);
    if (!defBlock) {
      continue;
    }

    let selectionStatus = DefinitionBlockStatus.OPTIONAL;
    if (includeRelatedDefBlockIds.has(blockId)) {
      selectionStatus = DefinitionBlockStatus.SELECTED;
    }
    if (excludeRelatedDefBlockIds.has(blockId)) {
      selectionStatus = DefinitionBlockStatus.EXCLUDED;
    }

    defBlock.refCount = validDefBlockCountMap.get(defBlock.id) || 0;
    defBlock.selectionStatus = selectionStatus;
    validDefBlockArray.push(defBlock);
  }

  return validDefBlockArray;
}

export function filterBacklinkDocumentBlocks(
  existingDocBlockArray = [],
  validBacklinkBlockNodeArray = [],
  queryParams = {},
) {
  const curDocBlockIdMap = formatDefBlockMap(existingDocBlockArray);
  const includeDocumentIds = queryParams.includeDocumentIds || new Set();
  const excludeDocumentIds = queryParams.excludeDocumentIds || new Set();
  const validDocBlockMap = new Map();

  for (const backlinkBlockNode of validBacklinkBlockNodeArray) {
    const blockRootId = backlinkBlockNode.block.root_id;
    let defBlock = validDocBlockMap.get(blockRootId);
    let refCount = 1;

    if (defBlock) {
      refCount = defBlock.refCount + 1;
    } else {
      defBlock = curDocBlockIdMap.get(blockRootId);
    }

    if (!defBlock) {
      continue;
    }

    let selectionStatus = DefinitionBlockStatus.OPTIONAL;
    if (includeDocumentIds.has(blockRootId)) {
      selectionStatus = DefinitionBlockStatus.SELECTED;
    }

    defBlock.selectionStatus = selectionStatus;
    defBlock.refCount = refCount;
    validDocBlockMap.set(blockRootId, defBlock);
  }

  for (const rootId of includeDocumentIds) {
    if (!validDocBlockMap.has(rootId)) {
      const defBlock = curDocBlockIdMap.get(rootId);
      if (!defBlock) {
        continue;
      }
      defBlock.selectionStatus = DefinitionBlockStatus.SELECTED;
      validDocBlockMap.set(rootId, defBlock);
    }
  }

  for (const rootId of excludeDocumentIds) {
    const defBlock = curDocBlockIdMap.get(rootId);
    if (!defBlock) {
      continue;
    }
    defBlock.selectionStatus = DefinitionBlockStatus.EXCLUDED;
    defBlock.refCount = 0;
    validDocBlockMap.set(rootId, defBlock);
  }

  return Array.from(validDocBlockMap.values());
}
