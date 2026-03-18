export function createBacklinkPanelActionHandlers({
  state,
  BacklinkFilterPanelAttributeService,
  resetFilterQueryParameters,
  resetBacklinkQueryParameters,
  toggleRelatedDefBlockCondition,
  toggleRelatedDocumentCondition,
  clonePanelQueryParamsForSave,
  applySavedPanelCriteria,
  isStrBlank,
  updateRenderData,
  refreshFilterDisplayData,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  function resetFilterQueryParametersToDefault() {
    const defaultQueryParams =
      BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
    resetFilterQueryParameters(state.queryParams, defaultQueryParams);
    state.queryParams = state.queryParams;
    return updateRenderData();
  }

  function resetBacklinkQueryParametersToDefault() {
    const defaultQueryParams =
      BacklinkFilterPanelAttributeService.ins.getDefaultQueryParams();
    resetBacklinkQueryParameters(state.queryParams, defaultQueryParams);
    return updateRenderData();
  }

  function addIncludeRelatedDefBlockCondition(defBlock) {
    toggleRelatedDefBlockCondition(state.queryParams, defBlock.id, "include");
    return updateRenderData();
  }

  function addExcludeRelatedDefBlockCondition(defBlock) {
    toggleRelatedDefBlockCondition(state.queryParams, defBlock.id, "exclude");
    return updateRenderData();
  }

  function addIncludeRelatedDocBlockCondition(defBlock) {
    toggleRelatedDocumentCondition(state.queryParams, defBlock.id, "include");
    return updateRenderData();
  }

  function addExcludeRelatedDocBlockCondition(defBlock) {
    toggleRelatedDocumentCondition(state.queryParams, defBlock.id, "exclude");
    return updateRenderData();
  }

  function handleRelatedDefBlockClick(event, defBlock) {
    if (event.shiftKey) {
      return addExcludeRelatedDefBlockCondition(defBlock);
    }
    state.clickCount += 1;
    if (state.clickCount === 1) {
      clearTimeoutImpl(state.clickTimeoutId);
      state.clickTimeoutId = setTimeoutImpl(() => {
        state.clickCount = 0;
        addIncludeRelatedDefBlockCondition(defBlock);
      }, state.doubleClickTimeout);
      return;
    }

    clearTimeoutImpl(state.clickTimeoutId);
    state.clickCount = 0;
    return addExcludeRelatedDefBlockCondition(defBlock);
  }

  function handleRelatedDefBlockContextmenu(_event, defBlock) {
    return addExcludeRelatedDefBlockCondition(defBlock);
  }

  function handleRelatedDocBlockClick(event, defBlock) {
    if (event.shiftKey) {
      return addExcludeRelatedDocBlockCondition(defBlock);
    }
    state.clickCount += 1;
    if (state.clickCount === 1) {
      clearTimeoutImpl(state.clickTimeoutId);
      state.clickTimeoutId = setTimeoutImpl(() => {
        state.clickCount = 0;
        addIncludeRelatedDocBlockCondition(defBlock);
      }, state.doubleClickTimeout);
      return;
    }

    clearTimeoutImpl(state.clickTimeoutId);
    state.clickCount = 0;
    return addExcludeRelatedDocBlockCondition(defBlock);
  }

  function handleRelatedDocBlockContextmenu(_event, defBlock) {
    return addExcludeRelatedDocBlockCondition(defBlock);
  }

  function handleCriteriaConfirm() {
    if (isStrBlank(state.saveCriteriaInputText)) {
      return;
    }
    const savedQueryParams = clonePanelQueryParamsForSave(state.queryParams);
    if (!state.savedQueryParamMap) {
      state.savedQueryParamMap = new Map();
    }
    state.savedQueryParamMap.set(state.saveCriteriaInputText, savedQueryParams);
    BacklinkFilterPanelAttributeService.ins.updatePanelSavedCriteriaMap(
      state.rootId,
      state.savedQueryParamMap,
    );
    state.savedQueryParamMap = state.savedQueryParamMap;
    state.saveCriteriaInputText = "";
    state.showSaveCriteriaInputBox = false;
  }

  function handleCriteriaCancel() {
    state.saveCriteriaInputText = "";
    state.showSaveCriteriaInputBox = false;
  }

  function handleSavedPanelCriteriaClick(name) {
    const savedQueryParam = state.savedQueryParamMap.get(name);
    if (!savedQueryParam) {
      return;
    }
    applySavedPanelCriteria(state.queryParams, savedQueryParam);
    return updateRenderData();
  }

  function handleSavedPanelCriteriaDeleteClick(name) {
    state.savedQueryParamMap.delete(name);
    BacklinkFilterPanelAttributeService.ins.updatePanelSavedCriteriaMap(
      state.rootId,
      state.savedQueryParamMap,
    );
    state.savedQueryParamMap = state.savedQueryParamMap;
  }

  function handleBacklinkKeywordInput() {
    clearTimeoutImpl(state.inputChangeTimeoutId);
    state.inputChangeTimeoutId = setTimeoutImpl(() => {
      updateRenderData();
    }, 450);
  }

  function handleFilterPanelInput() {
    clearTimeoutImpl(state.inputChangeTimeoutId);
    state.inputChangeTimeoutId = setTimeoutImpl(() => {
      refreshFilterDisplayData();
    }, 100);
  }

  return {
    resetFilterQueryParametersToDefault,
    resetBacklinkQueryParametersToDefault,
    addIncludeRelatedDefBlockCondition,
    addExcludeRelatedDefBlockCondition,
    addIncludeRelatedDocBlockCondition,
    addExcludeRelatedDocBlockCondition,
    handleRelatedDefBlockClick,
    handleRelatedDefBlockContextmenu,
    handleRelatedDocBlockClick,
    handleRelatedDocBlockContextmenu,
    handleCriteriaConfirm,
    handleCriteriaCancel,
    handleSavedPanelCriteriaClick,
    handleSavedPanelCriteriaDeleteClick,
    handleBacklinkKeywordInput,
    handleFilterPanelInput,
  };
}
