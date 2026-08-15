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

export function resetBacklinkQueryParameters(queryParams, defaultQueryParams) {
  queryParams.backlinkBlockSortMethod = defaultQueryParams?.backlinkBlockSortMethod || "modifiedDesc";
  queryParams.backlinkKeywordStr = "";
  queryParams.includeDocumentIds?.clear?.();
  queryParams.excludeDocumentIds?.clear?.();

  return queryParams;
}

export function toggleRelatedDocumentCondition(queryParams, documentId, mode) {
  if (!queryParams.includeDocumentIds) {
    queryParams.includeDocumentIds = new Set();
  }
  if (!queryParams.excludeDocumentIds) {
    queryParams.excludeDocumentIds = new Set();
  }
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
  queryParams.backlinkBlockSortMethod = savedQueryParam.backlinkBlockSortMethod || queryParams.backlinkBlockSortMethod;
  queryParams.backlinkKeywordStr = savedQueryParam.backlinkKeywordStr || "";
  queryParams.includeDocumentIds = savedQueryParam.includeDocumentIds || new Set();
  queryParams.excludeDocumentIds = savedQueryParam.excludeDocumentIds || new Set();

  return queryParams;
}

export function clonePanelQueryParamsForSave(queryParams) {
  return JSON.parse(JSON.stringify(queryParams));
}
