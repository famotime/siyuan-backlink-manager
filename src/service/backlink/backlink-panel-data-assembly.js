export async function buildBacklinkPanelData(paramObj, deps) {
  const {
    getBlockIds,
    collectBacklinkBlocks,
    collectHeadlineChildBlocks,
    collectListItemTreeNodes,
    collectParentBlocks,
    collectSiblingBlocks,
    getBacklinkEmbedBlockInfo,
    createBacklinkBlockNode,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    getRefBlockId,
    updateMaxValueMap,
    updateMapCount,
    ListItemTreeNode,
    isArrayNotEmpty,
    getBlockInfoMap,
    generateGetBlockArraySql,
    sql,
    applyAnchorsToCurrentDocumentBlocks,
    buildRelatedDefBlockArray,
    buildBacklinkDocumentArray,
    attachDocumentBlocksToBacklinkNodes,
  } = deps;

  const curDocDefBlockIdArray = getBlockIds(paramObj.curDocDefBlockArray);
  const backlinkBlockMap = {};
  const relatedDefBlockCountMap = new Map();
  const backlinkDocumentCountMap = new Map();
  const relatedDefBlockDynamicAnchorMap = new Map();
  const relatedDefBlockStaticAnchorMap = new Map();
  const backlinkBlockCreatedMap = new Map();
  const backlinkBlockUpdatedMap = new Map();

  const collectContext = {
    curDocDefBlockIdArray,
    backlinkBlockMap,
    relatedDefBlockCountMap,
    backlinkDocumentCountMap,
    relatedDefBlockDynamicAnchorMap,
    relatedDefBlockStaticAnchorMap,
    backlinkBlockCreatedMap,
    backlinkBlockUpdatedMap,
  };

  await collectBacklinkBlocks({
    backlinkBlockArray: paramObj.backlinkBlockArray,
    curDocDefBlockArray: paramObj.curDocDefBlockArray,
    getBacklinkEmbedBlockInfo,
    createBacklinkBlockNode,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    getRefBlockId,
    updateMaxValueMap,
    updateMapCount,
    context: collectContext,
  });

  const relatedDefBlockIdSet = new Set(relatedDefBlockCountMap.keys());
  collectHeadlineChildBlocks({
    headlinkBacklinkChildBlockArray: paramObj.headlinkBacklinkChildBlockArray,
    relatedDefBlockIdSet,
    getRefBlockId,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    updateMaxValueMap,
    updateMapCount,
    context: collectContext,
  });

  if (isArrayNotEmpty(paramObj.listItemBacklinkChildBlockArray)) {
    collectListItemTreeNodes({
      listItemTreeNodeArray: ListItemTreeNode.buildTree(
        paramObj.listItemBacklinkChildBlockArray,
      ),
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context: collectContext,
    });
  }

  collectParentBlocks({
    backlinkParentBlockArray: paramObj.backlinkParentBlockArray,
    relatedDefBlockIdSet,
    getRefBlockId,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    updateMapCount,
    context: collectContext,
  });

  if (paramObj.backlinkSiblingBlockGroupArray) {
    collectSiblingBlocks({
      backlinkSiblingBlockGroupArray: paramObj.backlinkSiblingBlockGroupArray,
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context: collectContext,
    });
  }

  const relatedDefBlockAndDocumentMap = await getBlockInfoMap(
    [...relatedDefBlockCountMap.keys(), ...backlinkDocumentCountMap.keys()],
    { generateGetBlockArraySql, sql },
  );

  applyAnchorsToCurrentDocumentBlocks(
    paramObj.curDocDefBlockArray,
    relatedDefBlockDynamicAnchorMap,
    relatedDefBlockStaticAnchorMap,
  );

  const relatedDefBlockArray = buildRelatedDefBlockArray({
    relatedDefBlockCountMap,
    relatedDefBlockAndDocumentMap,
    backlinkBlockCreatedMap,
    backlinkBlockUpdatedMap,
    relatedDefBlockDynamicAnchorMap,
    relatedDefBlockStaticAnchorMap,
  });
  const backlinkDocumentArray = buildBacklinkDocumentArray({
    backlinkDocumentCountMap,
    relatedDefBlockAndDocumentMap,
    backlinkBlockCreatedMap,
    backlinkBlockUpdatedMap,
  });

  attachDocumentBlocksToBacklinkNodes(
    backlinkBlockMap,
    relatedDefBlockAndDocumentMap,
  );

  return {
    rootId: paramObj.rootId,
    backlinkBlockNodeArray: Object.values(backlinkBlockMap),
    curDocDefBlockArray: paramObj.curDocDefBlockArray,
    relatedDefBlockArray,
    backlinkDocumentArray,
  };
}
