export function createBacklinkPanelInitCoordinator({
  state,
  SettingService,
  BacklinkFilterPanelAttributeService,
  buildBacklinkPanelInitStrategy,
  getBacklinkPanelData,
  resolveBacklinkPanelRefreshRootId,
  CacheManager,
  clearBacklinkProtyleList,
  updateRenderData,
  envConfig,
} = {}) {
  async function loadBacklinkPanelBaseData() {
    if (!state.rootId) {
      return null;
    }

    const settingConfig = SettingService.ins.SettingConfig;
    state.showBacklinkProtyleBreadcrumb =
      settingConfig?.showBacklinkProtyleBreadcrumb ?? false;

    state.backlinkFilterPanelBaseData = await getBacklinkPanelData({
      rootId: state.rootId,
    });
    state.displayHintPanelBaseDataCacheUsage = Boolean(
      state.backlinkFilterPanelBaseData?.userCache,
    );

    return state.backlinkFilterPanelBaseData;
  }

  async function initBaseData() {
    if (!state.rootId) {
      return;
    }
    const initStrategy = buildBacklinkPanelInitStrategy({
      previousRootId: state.previousRootId,
      rootId: state.rootId,
      hasQueryParams: Boolean(state.queryParams),
    });

    clearBacklinkProtyleList();
    if (initStrategy.resetDocumentActiveIndexes) {
      state.backlinkDocumentActiveIndexMap.clear();
    }

    state.previousRootId = state.rootId;
    await loadBacklinkPanelBaseData();

    const defaultPanelCriteria =
      await BacklinkFilterPanelAttributeService.ins.getPanelCriteria(state.rootId);

    if (!initStrategy.reuseExistingQueryParams) {
      state.queryParams = defaultPanelCriteria.queryParams;
      state.queryParams.pageNum = 1;
    } else {
      state.queryParams = state.queryParams;
    }

    await updateRenderData();
  }

  function clearCacheAndRefresh() {
    CacheManager.ins.deleteBacklinkPanelAllCache(state.rootId);
    initBaseData();
  }

  function refreshBacklinkPanelToCurrentMainDocument() {
    const nextRootId = resolveBacklinkPanelRefreshRootId({
      currentTab: state.currentTab,
      fallbackRootId: state.rootId,
      fallbackLastViewedDocId: envConfig?.lastViewedDocId,
    });
    if (!nextRootId) {
      return;
    }

    state.rootId = nextRootId;
    state.focusBlockId = null;
    CacheManager.ins.deleteBacklinkPanelAllCache(nextRootId);
    initBaseData();
  }

  return {
    loadBacklinkPanelBaseData,
    initBaseData,
    clearCacheAndRefresh,
    refreshBacklinkPanelToCurrentMainDocument,
  };
}
