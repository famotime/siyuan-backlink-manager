export function createBacklinkPanelDataCoordinator({
  state,
  getBacklinkPanelRenderData,
  getTurnPageBacklinkPanelRenderData,
  mergeTurnPageBacklinkPanelRenderData,
  refreshBacklinkPreview,
} = {}) {
  async function refreshFilterDisplayData() {
    // No-op after removing filter panel
  }

  async function updateRenderData() {
    state.backlinkFilterPanelRenderData = await getBacklinkPanelRenderData(
      state.backlinkFilterPanelBaseData,
      state.queryParams,
    );
    if (!state.backlinkFilterPanelRenderData || state.backlinkFilterPanelRenderData.rootId !== state.rootId) {
      return;
    }

    state.queryParams = state.queryParams;
    refreshBacklinkPreview();
  }

  async function pageTurning(pageNumParam) {
    if (
      !state.backlinkFilterPanelRenderData ||
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
