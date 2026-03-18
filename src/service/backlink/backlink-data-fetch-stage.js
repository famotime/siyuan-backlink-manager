export async function buildBacklinkFetchStageResult({
  rootId,
  pageBacklinkBlockArray = [],
  deps = {},
} = {}) {
  const {
    getBatchBacklinkDoc,
    loadOrderedBacklinkSourceWindowBlocks,
    attachBacklinkSourceWindows,
  } = deps;

  const backlinkCacheData = await getBatchBacklinkDoc();
  const backlinkDataArray = backlinkCacheData.backlinks;
  const usedCache = backlinkCacheData.usedCache;

  const orderedBlocksByRootId = await loadOrderedBacklinkSourceWindowBlocks(
    backlinkDataArray,
  );
  attachBacklinkSourceWindows({
    backlinkDataArray,
    backlinkBlockNodeArray: pageBacklinkBlockArray,
    orderedBlocksByRootId,
    contextVisibilityLevel: "extended",
  });

  return {
    rootId,
    backlinkDataArray,
    usedCache,
  };
}
