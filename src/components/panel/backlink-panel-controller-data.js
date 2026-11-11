export function createBacklinkPanelDataCoordinator({
  state,
  getBacklinkPanelRenderData,
  refreshBacklinkPreview,
} = {}) {
  async function updateRenderData() {
    state.backlinkFilterPanelRenderData = await getBacklinkPanelRenderData(
      state.backlinkFilterPanelBaseData,
      state.queryParams,
    );
    if (!state.backlinkFilterPanelRenderData || state.backlinkFilterPanelRenderData.rootId !== state.rootId) {
      return;
    }

    // 触发 Svelte 响应式失效（queryParams 的 set 访问器）
    state.queryParams = state.queryParams;
    refreshBacklinkPreview();
  }

  return {
    updateRenderData,
  };
}
