const BACKLINK_CONTEXT_PRESET_DEFAULTS = {
  compact: {
    queryParentDefBlock: false,
    querrChildDefBlockForListItem: false,
    queryChildDefBlockForHeadline: false,
    backlinkContextMaxVisibleFragments: 4,
    backlinkContextMaxVisibleChars: 160,
    backlinkContextMaxDepth: 2,
    backlinkContextMaxExpandedNodes: 8,
  },
  balanced: {
    queryParentDefBlock: true,
    querrChildDefBlockForListItem: true,
    queryChildDefBlockForHeadline: false,
    backlinkContextMaxVisibleFragments: 6,
    backlinkContextMaxVisibleChars: 240,
    backlinkContextMaxDepth: 3,
    backlinkContextMaxExpandedNodes: 12,
  },
  expanded: {
    queryParentDefBlock: true,
    querrChildDefBlockForListItem: true,
    queryChildDefBlockForHeadline: true,
    backlinkContextMaxVisibleFragments: 8,
    backlinkContextMaxVisibleChars: 360,
    backlinkContextMaxDepth: 4,
    backlinkContextMaxExpandedNodes: 18,
  },
};

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
  enableFilterPanel: false,
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
  backlinkContextPreset: "balanced",
  backlinkContextMaxVisibleFragments: 6,
  backlinkContextMaxVisibleChars: 240,
  backlinkContextMaxDepth: 3,
  backlinkContextMaxExpandedNodes: 12,
};

export function createDefaultSettingConfig() {
  return { ...DEFAULT_SETTING_CONFIG };
}

export function resolveSettingConfig(persistentConfig = {}) {
  const normalizedPersistentConfig = persistentConfig || {};
  const resolvedPreset = resolveBacklinkContextPreset(normalizedPersistentConfig);
  return {
    ...createDefaultSettingConfig(),
    ...BACKLINK_CONTEXT_PRESET_DEFAULTS[resolvedPreset],
    ...normalizedPersistentConfig,
    backlinkContextPreset: resolvedPreset,
  };
}

export function shouldPersistSettingConfig(currentConfig = {}, nextConfig = {}) {
  return JSON.stringify(currentConfig) !== JSON.stringify(nextConfig);
}

function resolveBacklinkContextPreset(persistentConfig = {}) {
  if (persistentConfig.backlinkContextPreset) {
    return persistentConfig.backlinkContextPreset;
  }

  if (persistentConfig.queryChildDefBlockForHeadline === true) {
    return "expanded";
  }

  if (
    persistentConfig.queryParentDefBlock === false &&
    persistentConfig.querrChildDefBlockForListItem === false &&
    persistentConfig.queryChildDefBlockForHeadline === false
  ) {
    return "compact";
  }

  return "balanced";
}
