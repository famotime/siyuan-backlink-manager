function recoverSelection(includeIds, excludeIds, blockId) {
  if (includeIds.has(blockId)) {
    includeIds.delete(blockId);
    return true;
  }
  if (excludeIds.has(blockId)) {
    excludeIds.delete(blockId);
    return true;
  }
  return false;
}

function toggleSelection(includeIds, excludeIds, blockId, mode) {
  const recovered = recoverSelection(includeIds, excludeIds, blockId);
  if (recovered) {
    return;
  }

  if (mode === "exclude") {
    excludeIds.add(blockId);
    return;
  }

  includeIds.add(blockId);
}

export function resetFilterQueryParameters(queryParams, defaultQueryParams) {
  queryParams.filterPanelCurDocDefBlockSortMethod =
    defaultQueryParams.filterPanelCurDocDefBlockSortMethod;
  queryParams.filterPanelCurDocDefBlockKeywords = "";

  queryParams.includeRelatedDefBlockIds.clear();
  queryParams.excludeRelatedDefBlockIds.clear();
  queryParams.filterPanelRelatedDefBlockType =
    defaultQueryParams.filterPanelRelatedDefBlockType;
  queryParams.filterPanelRelatedDefBlockSortMethod =
    defaultQueryParams.filterPanelRelatedDefBlockSortMethod;
  queryParams.filterPanelRelatedDefBlockKeywords = "";

  queryParams.includeDocumentIds.clear();
  queryParams.excludeDocumentIds.clear();
  queryParams.filterPanelBacklinkDocumentSortMethod =
    defaultQueryParams.filterPanelBacklinkDocumentSortMethod;
  queryParams.filterPanelBacklinkDocumentKeywords = "";

  return queryParams;
}

export function resetBacklinkQueryParameters(queryParams, defaultQueryParams) {
  queryParams.backlinkCurDocDefBlockType =
    defaultQueryParams.backlinkCurDocDefBlockType;
  queryParams.backlinkBlockSortMethod = defaultQueryParams.backlinkBlockSortMethod;
  queryParams.backlinkKeywordStr = "";

  return queryParams;
}

export function toggleRelatedDefBlockCondition(queryParams, defBlockId, mode) {
  toggleSelection(
    queryParams.includeRelatedDefBlockIds,
    queryParams.excludeRelatedDefBlockIds,
    defBlockId,
    mode,
  );

  return queryParams;
}

export function toggleRelatedDocumentCondition(queryParams, documentId, mode) {
  toggleSelection(
    queryParams.includeDocumentIds,
    queryParams.excludeDocumentIds,
    documentId,
    mode,
  );

  return queryParams;
}

export function applySavedPanelCriteria(queryParams, savedQueryParam) {
  if (!savedQueryParam) {
    return queryParams;
  }

  queryParams.pageNum = 1;
  queryParams.backlinkCurDocDefBlockType = savedQueryParam.backlinkCurDocDefBlockType;
  queryParams.backlinkBlockSortMethod = savedQueryParam.backlinkBlockSortMethod;
  queryParams.backlinkKeywordStr = savedQueryParam.backlinkKeywordStr;
  queryParams.includeRelatedDefBlockIds = savedQueryParam.includeRelatedDefBlockIds;
  queryParams.excludeRelatedDefBlockIds = savedQueryParam.excludeRelatedDefBlockIds;
  queryParams.includeDocumentIds = savedQueryParam.includeDocumentIds;
  queryParams.excludeDocumentIds = savedQueryParam.excludeDocumentIds;
  queryParams.filterPanelCurDocDefBlockSortMethod =
    savedQueryParam.filterPanelCurDocDefBlockSortMethod;
  queryParams.filterPanelCurDocDefBlockKeywords =
    savedQueryParam.filterPanelCurDocDefBlockKeywords;
  queryParams.filterPanelRelatedDefBlockType =
    savedQueryParam.filterPanelRelatedDefBlockType;
  queryParams.filterPanelRelatedDefBlockSortMethod =
    savedQueryParam.filterPanelRelatedDefBlockSortMethod;
  queryParams.filterPanelRelatedDefBlockKeywords =
    savedQueryParam.filterPanelRelatedDefBlockKeywords;
  queryParams.filterPanelBacklinkDocumentSortMethod =
    savedQueryParam.filterPanelBacklinkDocumentSortMethod;
  queryParams.filterPanelBacklinkDocumentKeywords =
    savedQueryParam.filterPanelBacklinkDocumentKeywords;

  return queryParams;
}

export function clonePanelQueryParamsForSave(queryParams) {
  return JSON.parse(JSON.stringify(queryParams));
}
