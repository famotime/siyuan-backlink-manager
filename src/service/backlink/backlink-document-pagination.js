function getDocumentId(backlinkBlockNode) {
  return backlinkBlockNode?.block?.root_id;
}

export function buildBacklinkDocumentRenderState(backlinkBlockNodeArray = []) {
  const documentIdSet = new Set();
  const renderBacklinkBlockArray = [];

  for (const backlinkBlockNode of backlinkBlockNodeArray) {
    const documentId = getDocumentId(backlinkBlockNode);
    if (!documentId) {
      continue;
    }
    documentIdSet.add(documentId);
    renderBacklinkBlockArray.push(backlinkBlockNode);
  }

  return {
    pageNum: documentIdSet.size > 0 ? 1 : 0,
    totalPage: documentIdSet.size > 0 ? 1 : 0,
    totalDocumentCount: documentIdSet.size,
    pageBacklinkBlockArray: renderBacklinkBlockArray,
  };
}
