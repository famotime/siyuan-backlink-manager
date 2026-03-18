export function buildValidBacklinkRenderNodes({
  backlinkBlockNodeArray = [],
  queryParams,
  contextBudget = null,
  deps = {},
} = {}) {
  const {
    isBacklinkBlockValid,
    backlinkBlockNodeArraySort,
    applyBacklinkContextVisibilityToNodes,
    applyBacklinkContextBudgetToNodes,
  } = deps;

  const validBacklinkBlockNodeArray = [];
  for (const backlinkBlockNode of backlinkBlockNodeArray || []) {
    const valid = isBacklinkBlockValid?.(queryParams, backlinkBlockNode);
    if (!valid) {
      continue;
    }
    validBacklinkBlockNodeArray.push(backlinkBlockNode);
  }

  backlinkBlockNodeArraySort?.(
    validBacklinkBlockNodeArray,
    queryParams?.backlinkBlockSortMethod,
  );
  applyBacklinkContextVisibilityToNodes?.(
    validBacklinkBlockNodeArray,
    queryParams?.backlinkContextVisibilityLevel || "core",
  );
  applyBacklinkContextBudgetToNodes?.(
    validBacklinkBlockNodeArray,
    contextBudget,
  );

  return validBacklinkBlockNodeArray;
}

export function buildBacklinkPanelRenderDataResult({
  rootId = "",
  backlinkDataArray = [],
  pagination = {},
  validBacklinkBlockNodeArray = null,
  filterCurDocDefBlockArray = null,
  filterRelatedDefBlockArray = null,
  filterBacklinkDocumentArray = null,
  pageSize = 0,
  usedCache = false,
} = {}) {
  return {
    rootId,
    backlinkDataArray,
    backlinkDocumentCount: pagination?.totalDocumentCount,
    backlinkBlockNodeArray: validBacklinkBlockNodeArray,
    curDocDefBlockArray: filterCurDocDefBlockArray,
    relatedDefBlockArray: filterRelatedDefBlockArray,
    backlinkDocumentArray: filterBacklinkDocumentArray,
    pageNum: pagination?.pageNum,
    pageSize,
    totalPage: pagination?.totalPage,
    usedCache,
  };
}
