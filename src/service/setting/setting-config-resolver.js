const DEFAULT_SETTING_CONFIG = {
  dockDisplay: true,
  documentBottomDisplay: false,
  flashCardBottomDisplay: false,
  topBarDisplay: true,
  cacheAfterResponseMs: -1,
  cacheExpirationTime: 5 * 60,
  usePraentIdIdx: false,
  doubleClickTimeout: 0,
  documentBottomBacklinkPaddingWidth: null,
  filterPanelViewExpand: false,
  queryParentDefBlock: true,
  querrChildDefBlockForListItem: true,
  queryChildDefBlockForHeadline: false,
  filterPanelCurDocDefBlockSortMethod: "typeAndContent",
  filterPanelRelatedDefBlockSortMethod: "modifiedDesc",
  filterPanelBacklinkDocumentSortMethod: "createdDesc",
  defaultSelectedViewBlock: false,
  docBottomBacklinkPanelViewExpand: true,
  pageSize: 8,
  backlinkBlockSortMethod: "modifiedDesc",
  hideBacklinkProtyleBreadcrumb: false,
  defaultExpandedListItemLevel: 0,
};

export function createDefaultSettingConfig() {
  return { ...DEFAULT_SETTING_CONFIG };
}

export function resolveSettingConfig(persistentConfig = {}) {
  return {
    ...createDefaultSettingConfig(),
    ...(persistentConfig || {}),
  };
}

export function shouldPersistSettingConfig(currentConfig = {}, nextConfig = {}) {
  return JSON.stringify(currentConfig) !== JSON.stringify(nextConfig);
}
