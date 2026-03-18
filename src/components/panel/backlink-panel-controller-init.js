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
    state.hideBacklinkProtyleBreadcrumb =
      settingConfig.hideBacklinkProtyleBreadcrumb;

    state.backlinkFilterPanelBaseData = await getBacklinkPanelData({
      rootId: state.rootId,
      focusBlockId: state.focusBlockId,
      queryParentDefBlock: settingConfig.queryParentDefBlock,
      querrChildDefBlockForListItem:
        settingConfig.querrChildDefBlockForListItem,
      queryChildDefBlockForHeadline:
        settingConfig.queryChildDefBlockForHeadline,
      queryCurDocDefBlockRange: state.queryCurDocDefBlockRange,
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
    state.previousFocusBlockId = state.focusBlockId;
    const settingConfig = SettingService.ins.SettingConfig;
    await loadBacklinkPanelBaseData();

    const defaultPanelCriteria =
      await BacklinkFilterPanelAttributeService.ins.getPanelCriteria(state.rootId);

    if (!initStrategy.reuseExistingQueryParams) {
      state.queryParams = defaultPanelCriteria.queryParams;
      state.panelFilterViewExpand =
        defaultPanelCriteria.backlinkPanelFilterViewExpand;
      state.queryParams.pageNum = 1;
    } else {
      state.queryParams = state.queryParams;
      state.panelFilterViewExpand = state.panelFilterViewExpand;
    }

    state.savedQueryParamMap =
      await BacklinkFilterPanelAttributeService.ins.getPanelSavedCriteriaMap(
        state.rootId,
      );

    if (
      settingConfig.defaultSelectedViewBlock &&
      initStrategy.applyDefaultSelectedViewBlock
    ) {
      const selectBlockId = state.rootId;
      let viewBlockExistBacklink = false;
      state.backlinkFilterPanelBaseData.curDocDefBlockArray.forEach((item) => {
        if (item.id === selectBlockId) {
          viewBlockExistBacklink = true;
        }
      });

      if (viewBlockExistBacklink) {
        state.queryParams.includeRelatedDefBlockIds = new Set();
        state.queryParams.excludeRelatedDefBlockIds = new Set();
        state.queryParams.includeDocumentIds = new Set();
        state.queryParams.excludeDocumentIds = new Set();
        state.queryParams.includeRelatedDefBlockIds.add(selectBlockId);
      }
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
      fallbackLastViewedDocId: envConfig.lastViewedDocId,
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
