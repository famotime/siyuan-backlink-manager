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
  for (const defBlock of defBlockArray || []) {
    if (defBlock && defBlock.id) {
      map.set(defBlock.id, defBlock);
    }
  }
  return map;
}

export function sanitizeBacklinkRenderQueryParams(queryParams, backlinkPanelData = {}) {
  const invalidDocumentId = new Set();
  const backlinkDocumentIds = getBlockIds(backlinkPanelData?.backlinkDocumentArray || []);

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

  for (const blockId of invalidDocumentId) {
    queryParams.includeDocumentIds.delete(blockId);
    queryParams.excludeDocumentIds.delete(blockId);
  }

  for (const node of backlinkPanelData?.backlinkBlockNodeArray || []) {
    if (node.parentListItemTreeNode) {
      node.parentListItemTreeNode.includeChildIdArray = null;
      node.parentListItemTreeNode.excludeChildIdArray = null;
    }
  }
}

export function filterExistingDefBlocks(
  existingDefBlockArray = [],
  _validBacklinkBlockNodeArray = [],
  _queryParams = {},
) {
  return existingDefBlockArray || [];
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

  for (const backlinkBlockNode of validBacklinkBlockNodeArray || []) {
    const blockRootId = backlinkBlockNode.block?.root_id;
    if (!blockRootId) {
      continue;
    }
    let defBlock = validDocBlockMap.get(blockRootId);
    let refCount = 1;

    if (defBlock) {
      refCount = defBlock.refCount + 1;
    } else {
      defBlock = curDocBlockIdMap.get(blockRootId) || {
        id: blockRootId,
        content: backlinkBlockNode.documentBlock?.content || "",
      };
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
      if (defBlock) {
        defBlock.selectionStatus = DefinitionBlockStatus.SELECTED;
        validDocBlockMap.set(rootId, defBlock);
      }
    }
  }

  for (const rootId of excludeDocumentIds) {
    const defBlock = curDocBlockIdMap.get(rootId);
    if (defBlock) {
      defBlock.selectionStatus = DefinitionBlockStatus.EXCLUDED;
      defBlock.refCount = 0;
      validDocBlockMap.set(rootId, defBlock);
    }
  }

  return Array.from(validDocBlockMap.values());
}
