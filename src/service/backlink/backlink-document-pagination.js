function getDocumentId(backlinkBlockNode) {
  return backlinkBlockNode?.block?.root_id;
}

export function paginateBacklinkBlocksByDocument(
  backlinkBlockNodeArray = [],
  pageNum = 1,
  pageSize = 0,
) {
  if (pageSize <= 0) {
    return {
      pageNum: 0,
      totalPage: 0,
      totalDocumentCount: 0,
      pageBacklinkBlockArray: [],
    };
  }

  const documentGroups = [];
  const documentGroupMap = new Map();

  for (const backlinkBlockNode of backlinkBlockNodeArray) {
    const documentId = getDocumentId(backlinkBlockNode);
    if (!documentId) {
      continue;
    }

    let group = documentGroupMap.get(documentId);
    if (!group) {
      group = [];
      documentGroupMap.set(documentId, group);
      documentGroups.push(group);
    }

    group.push(backlinkBlockNode);
  }

  const totalDocumentCount = documentGroups.length;
  const totalPage = Math.ceil(totalDocumentCount / pageSize);
  const normalizedPageNum = totalPage <= 0
    ? 0
    : Math.min(Math.max(pageNum, 1), totalPage);
  const pageStartIndex = normalizedPageNum <= 0
    ? 0
    : (normalizedPageNum - 1) * pageSize;
  const pageDocumentGroups = documentGroups.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );

  return {
    pageNum: normalizedPageNum,
    totalPage,
    totalDocumentCount,
    pageBacklinkBlockArray: pageDocumentGroups.flat(),
  };
}
