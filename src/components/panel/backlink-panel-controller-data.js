export function createBacklinkPanelDataCoordinator({
  state,
  defBlockArrayTypeAndKeywordFilter,
  defBlockArraySort,
  getBatchBlockIdIndex,
  getBacklinkPanelRenderData,
  getTurnPageBacklinkPanelRenderData,
  mergeTurnPageBacklinkPanelRenderData,
  refreshBacklinkPreview,
} = {}) {
  async function refreshFilterDisplayData() {
    if (!state.backlinkFilterPanelRenderData || !state.queryParams) {
      return;
    }

    const curDocDefBlockArray =
      state.backlinkFilterPanelRenderData.curDocDefBlockArray;
    const relatedDefBlockArray =
      state.backlinkFilterPanelRenderData.relatedDefBlockArray;
    const backlinkDocumentArray =
      state.backlinkFilterPanelRenderData.backlinkDocumentArray;

    defBlockArrayTypeAndKeywordFilter(
      curDocDefBlockArray,
      null,
      state.queryParams.filterPanelCurDocDefBlockKeywords,
    );
    defBlockArrayTypeAndKeywordFilter(
      relatedDefBlockArray,
      state.queryParams.filterPanelRelatedDefBlockType,
      state.queryParams.filterPanelRelatedDefBlockKeywords,
    );
    defBlockArrayTypeAndKeywordFilter(
      backlinkDocumentArray,
      null,
      state.queryParams.filterPanelBacklinkDocumentKeywords,
    );

    await defBlockArraySort(
      curDocDefBlockArray,
      state.queryParams.filterPanelCurDocDefBlockSortMethod,
      { getBatchBlockIdIndex },
    );
    await defBlockArraySort(
      relatedDefBlockArray,
      state.queryParams.filterPanelRelatedDefBlockSortMethod,
      { getBatchBlockIdIndex },
    );
    await defBlockArraySort(
      backlinkDocumentArray,
      state.queryParams.filterPanelBacklinkDocumentSortMethod,
      { getBatchBlockIdIndex },
    );

    state.backlinkFilterPanelRenderData = state.backlinkFilterPanelRenderData;
  }

  async function updateRenderData() {
    state.backlinkFilterPanelRenderData = await getBacklinkPanelRenderData(
      state.backlinkFilterPanelBaseData,
      state.queryParams,
    );
    if (state.backlinkFilterPanelRenderData.rootId !== state.rootId) {
      return;
    }

    state.queryParams = state.queryParams;
    await refreshFilterDisplayData();
    refreshBacklinkPreview();
  }

  async function pageTurning(pageNumParam) {
    if (
      pageNumParam < 1 ||
      pageNumParam > state.backlinkFilterPanelRenderData.totalPage
    ) {
      return;
    }

    state.queryParams.pageNum = pageNumParam;
    const pageBacklinkPanelRenderData =
      await getTurnPageBacklinkPanelRenderData(
        state.backlinkFilterPanelRenderData.rootId,
        state.backlinkFilterPanelRenderData.backlinkBlockNodeArray,
        state.queryParams,
      );

    state.backlinkFilterPanelRenderData = mergeTurnPageBacklinkPanelRenderData(
      state.backlinkFilterPanelRenderData,
      pageBacklinkPanelRenderData,
    );
    state.queryParams = state.queryParams;
    refreshBacklinkPreview();
  }

  return {
    refreshFilterDisplayData,
    updateRenderData,
    pageTurning,
  };
}
