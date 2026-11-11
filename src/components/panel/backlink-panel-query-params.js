export function resetBacklinkQueryParameters(queryParams, defaultQueryParams) {
  queryParams.backlinkBlockSortMethod = defaultQueryParams?.backlinkBlockSortMethod || "modifiedDesc";
  queryParams.backlinkKeywordStr = "";
  queryParams.includeDocumentIds?.clear?.();
  queryParams.excludeDocumentIds?.clear?.();

  return queryParams;
}
