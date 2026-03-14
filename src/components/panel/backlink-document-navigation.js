function normalizeActiveIndex(index, totalCount) {
  if (!Number.isInteger(index) || totalCount <= 0) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= totalCount) {
    return totalCount - 1;
  }

  return index;
}

export function getCyclicBacklinkIndex(totalCount, currentIndex, direction) {
  if (totalCount <= 1) {
    return 0;
  }

  if (direction === "previous") {
    return (currentIndex - 1 + totalCount) % totalCount;
  }

  return (currentIndex + 1) % totalCount;
}

export function groupBacklinksByDocument(
  backlinkDocumentArray = [],
  backlinkDataArray = [],
  activeIndexByDocument = new Map(),
) {
  const documentNameMap = new Map(
    backlinkDocumentArray.map((document) => [document.id, document.content]),
  );
  const documentGroupMap = new Map();
  const documentGroups = [];

  for (const backlinkData of backlinkDataArray) {
    const backlinkBlock = backlinkData?.backlinkBlock;
    const documentId = backlinkBlock?.root_id;
    if (!documentId) {
      continue;
    }

    let group = documentGroupMap.get(documentId);
    if (!group) {
      group = {
        documentId,
        documentName: documentNameMap.get(documentId) || "",
        backlinks: [],
      };
      documentGroupMap.set(documentId, group);
      documentGroups.push(group);
    }

    group.backlinks.push(backlinkData);
  }

  return documentGroups.map((group) => {
    const activeIndex = normalizeActiveIndex(
      activeIndexByDocument.get(group.documentId),
      group.backlinks.length,
    );
    const activeBacklink = group.backlinks[activeIndex];

    return {
      ...group,
      activeIndex,
      activeBacklink,
      progressText: `${activeIndex + 1}/${group.backlinks.length}`,
    };
  });
}
