export function mergeTurnPageBacklinkPanelRenderData(
  currentRenderData = {},
  turnPageRenderData = {},
) {
  return {
    ...currentRenderData,
    backlinkDataArray:
      turnPageRenderData.backlinkDataArray ??
      currentRenderData.backlinkDataArray,
    pageNum: turnPageRenderData.pageNum ?? currentRenderData.pageNum,
    pageSize: turnPageRenderData.pageSize ?? currentRenderData.pageSize,
    totalPage: turnPageRenderData.totalPage ?? currentRenderData.totalPage,
    usedCache: turnPageRenderData.usedCache ?? currentRenderData.usedCache,
  };
}
