export function createBacklinkPanelActionHandlers({
  state,
  BacklinkFilterPanelAttributeService,
  resetBacklinkQueryParameters,
  updateRenderData,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  function resetBacklinkQueryParametersToDefault() {
    const defaultQueryParams =
      BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
    resetBacklinkQueryParameters(state.queryParams, defaultQueryParams);
    return updateRenderData();
  }

  function handleBacklinkKeywordInput() {
    clearTimeoutImpl(state.inputChangeTimeoutId);
    state.inputChangeTimeoutId = setTimeoutImpl(() => {
      updateRenderData();
    }, 300);
  }

  return {
    resetBacklinkQueryParametersToDefault,
    handleBacklinkKeywordInput,
  };
}
