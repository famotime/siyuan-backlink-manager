export async function buildBacklinkPanelData(paramObj, deps) {
  const {
    getBlockIds,
    collectBacklinkBlocks,
    collectSiblingBlocks,
    createBacklinkBlockNode,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    getRefBlockId,
    updateMaxValueMap,
    updateMapCount,
    getBlockInfoMap,
    generateGetBlockArraySql,
    sql,
    applyAnchorsToCurrentDocumentBlocks,
    buildRelatedDefBlockArray,
    buildBacklinkDocumentArray,
    attachDocumentBlocksToBacklinkNodes,
    hydrateBacklinkContextBundles,
    getQueryStrByBlock,
    getMarkdownAnchorTextArray,
    removeMarkdownRefBlockStyle,
  } = deps;

  const curDocDefBlockIdArray = [paramObj.rootId, ...getBlockIds(paramObj.curDocDefBlockArray)].filter(Boolean);
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
    createBacklinkBlockNode,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    getRefBlockId,
    updateMaxValueMap,
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
  const blockIdQueryArray = [
    paramObj.rootId,
    ...relatedDefBlockCountMap.keys(),
    ...backlinkDocumentCountMap.keys(),
  ].filter(Boolean);
  const relatedDefBlockAndDocumentMap = await getBlockInfoMap(
    blockIdQueryArray,
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
  if (deps.resolveBacklinkTargetBlocks) {
    for (const node of Object.values(backlinkBlockMap)) {
      node.targetBlocks = deps.resolveBacklinkTargetBlocks({
        backlinkBlockNode: node,
        curRootId: paramObj.rootId,
        relatedDefBlockAndDocumentMap,
        curDocDefBlockArray: paramObj.curDocDefBlockArray,
      });
    }
  }
  if (hydrateBacklinkContextBundles) {
    hydrateBacklinkContextBundles(Object.values(backlinkBlockMap), {
      getQueryStrByBlock,
      getMarkdownAnchorTextArray,
      removeMarkdownRefBlockStyle,
      getRefBlockId,
    });
  }

  return {
    rootId: paramObj.rootId,
    backlinkBlockNodeArray: Object.values(backlinkBlockMap),
    curDocDefBlockArray: paramObj.curDocDefBlockArray,
    relatedDefBlockArray,
    backlinkDocumentArray,
  };
}
