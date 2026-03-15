const OPTIONAL_SELECTION_STATUS = "OPTIONAL";

function isSetNotEmpty(set) {
  return set && set.size > 0;
}

function isSetEmpty(set) {
  return !set || set.size === 0;
}

function getJoinedAnchorText(anchorMap, blockId) {
  const anchorSet = anchorMap.get(blockId);
  return isSetNotEmpty(anchorSet) ? Array.from(anchorSet).join(" ") : "";
}

export function getBlockIds(blockList = []) {
  const blockIds = [];
  for (const block of blockList) {
    if (!block) {
      continue;
    }
    blockIds.push(block.id);
  }
  return blockIds;
}

export function createBacklinkBlockNode(backlinkBlock) {
  return {
    block: { ...backlinkBlock, refCount: null },
    documentBlock: null,
    selfRenderMarkdown: "",
    parentMarkdown: "",
    parentRenderMarkdown: "",
    listItemChildMarkdown: "",
    headlineChildMarkdown: "",
    previousSiblingMarkdown: "",
    nextSiblingMarkdown: "",
    previousSiblingRenderMarkdown: "",
    nextSiblingRenderMarkdown: "",
    beforeExpandedMarkdown: "",
    beforeExpandedRenderMarkdown: "",
    expandedMarkdown: "",
    expandedRenderMarkdown: "",
    afterExpandedMarkdown: "",
    afterExpandedRenderMarkdown: "",
    includeDirectDefBlockIds: new Set(),
    includeRelatedDefBlockIds: new Set(),
    includeCurBlockDefBlockIds: new Set(),
    includeParentDefBlockIds: new Set(),
    dynamicAnchorMap: new Map(),
    staticAnchorMap: new Map(),
    parentContextBlockIds: [],
    previousSiblingBlockId: "",
    nextSiblingBlockId: "",
    beforeExpandedBlockIdArray: [],
    afterExpandedBlockIdArray: [],
  };
}

export function applyAnchorsToCurrentDocumentBlocks(
  curDocDefBlockArray = [],
  relatedDefBlockDynamicAnchorMap = new Map(),
  relatedDefBlockStaticAnchorMap = new Map(),
) {
  for (const defBlock of curDocDefBlockArray) {
    const blockId = defBlock.id;
    defBlock.dynamicAnchor = getJoinedAnchorText(
      relatedDefBlockDynamicAnchorMap,
      blockId,
    );
    defBlock.staticAnchor = getJoinedAnchorText(
      relatedDefBlockStaticAnchorMap,
      blockId,
    );
  }
}

export function buildRelatedDefBlockArray({
  relatedDefBlockCountMap = new Map(),
  relatedDefBlockAndDocumentMap = new Map(),
  backlinkBlockCreatedMap = new Map(),
  backlinkBlockUpdatedMap = new Map(),
  relatedDefBlockDynamicAnchorMap = new Map(),
  relatedDefBlockStaticAnchorMap = new Map(),
} = {}) {
  const relatedDefBlockArray = [];

  for (const blockId of relatedDefBlockCountMap.keys()) {
    const blockCount = relatedDefBlockCountMap.get(blockId);
    const blockInfo = relatedDefBlockAndDocumentMap.get(blockId);
    const created = backlinkBlockCreatedMap.get(blockId);
    const updated = backlinkBlockUpdatedMap.get(blockId);
    const dynamicAnchor = getJoinedAnchorText(
      relatedDefBlockDynamicAnchorMap,
      blockId,
    );
    const staticAnchor = getJoinedAnchorText(
      relatedDefBlockStaticAnchorMap,
      blockId,
    );

    if (blockInfo) {
      relatedDefBlockArray.push({
        ...blockInfo,
        refCount: blockCount,
        selectionStatus: OPTIONAL_SELECTION_STATUS,
        created: created || blockInfo.created,
        updated: updated || blockInfo.updated,
        dynamicAnchor,
        staticAnchor,
      });
      continue;
    }

    const dynamicAnchorSet = relatedDefBlockDynamicAnchorMap.get(blockId);
    const staticAnchorSet = relatedDefBlockStaticAnchorMap.get(blockId);
    if (isSetEmpty(dynamicAnchorSet) && isSetEmpty(staticAnchorSet)) {
      continue;
    }

    relatedDefBlockArray.push({
      id: blockId,
      content: isSetNotEmpty(dynamicAnchorSet)
        ? dynamicAnchorSet.values().next().value
        : staticAnchorSet.values().next().value,
      refCount: blockCount,
      created,
      updated,
      dynamicAnchor: "",
      staticAnchor: "",
      selectionStatus: OPTIONAL_SELECTION_STATUS,
    });
  }

  return relatedDefBlockArray;
}

export function buildBacklinkDocumentArray({
  backlinkDocumentCountMap = new Map(),
  relatedDefBlockAndDocumentMap = new Map(),
  backlinkBlockCreatedMap = new Map(),
  backlinkBlockUpdatedMap = new Map(),
} = {}) {
  const backlinkDocumentArray = [];

  for (const blockId of backlinkDocumentCountMap.keys()) {
    const blockInfo = relatedDefBlockAndDocumentMap.get(blockId);
    if (!blockInfo) {
      continue;
    }

    backlinkDocumentArray.push({
      ...blockInfo,
      refCount: backlinkDocumentCountMap.get(blockId),
      selectionStatus: OPTIONAL_SELECTION_STATUS,
      created: backlinkBlockCreatedMap.get(blockInfo.id) || blockInfo.created,
      updated: backlinkBlockUpdatedMap.get(blockInfo.id) || blockInfo.updated,
    });
  }

  return backlinkDocumentArray;
}

export function attachDocumentBlocksToBacklinkNodes(
  backlinkBlockMap = {},
  relatedDefBlockAndDocumentMap = new Map(),
) {
  for (const node of Object.values(backlinkBlockMap)) {
    node.documentBlock = relatedDefBlockAndDocumentMap.get(node.block.root_id);
  }
}
