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

function getBacklinkSourceDocumentOrder(backlinkData = null) {
  if (Number.isFinite(backlinkData?.sourceDocumentOrder)) {
    return backlinkData.sourceDocumentOrder;
  }

  const sourceWindowOrder = backlinkData?.sourceWindows?.core?.sourceDocumentOrder;
  if (Number.isFinite(sourceWindowOrder)) {
    return sourceWindowOrder;
  }

  return Number.POSITIVE_INFINITY;
}

function compareByOptionalNumber(valueA, valueB) {
  const hasValueA = Number.isFinite(valueA);
  const hasValueB = Number.isFinite(valueB);

  if (hasValueA && hasValueB) {
    return valueA - valueB;
  }
  if (hasValueA !== hasValueB) {
    return hasValueA ? -1 : 1;
  }

  return 0;
}

function getBacklinkBlockSortValue(backlinkData = null) {
  const sortValue = Number(backlinkData?.backlinkBlock?.sort);
  return Number.isFinite(sortValue) ? sortValue : Number.POSITIVE_INFINITY;
}

function getBacklinkBlockPath(backlinkData = null) {
  return String(backlinkData?.backlinkBlock?.path || "");
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
  const documentOrderMap = new Map(
    backlinkDocumentArray.map((document, index) => [document.id, index]),
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

  return documentGroups
    .sort((groupA, groupB) => {
      const documentOrderResult = compareByOptionalNumber(
        documentOrderMap.get(groupA.documentId),
        documentOrderMap.get(groupB.documentId),
      );
      if (documentOrderResult !== 0) {
        return documentOrderResult;
      }

      return groupA.documentId.localeCompare(groupB.documentId);
    })
    .map((group) => {
    group.backlinks = group.backlinks
      .map((backlink, index) => ({
        backlink,
        index,
      }))
      .sort((itemA, itemB) => {
        const sourceOrderResult = compareByOptionalNumber(
          getBacklinkSourceDocumentOrder(itemA.backlink),
          getBacklinkSourceDocumentOrder(itemB.backlink),
        );
        if (sourceOrderResult !== 0) {
          return sourceOrderResult;
        }

        const blockSortResult =
          getBacklinkBlockSortValue(itemA.backlink) -
          getBacklinkBlockSortValue(itemB.backlink);
        if (blockSortResult !== 0) {
          return blockSortResult;
        }

        const pathResult = getBacklinkBlockPath(itemA.backlink).localeCompare(
          getBacklinkBlockPath(itemB.backlink),
        );
        if (pathResult !== 0) {
          return pathResult;
        }

        return itemA.index - itemB.index;
      })
      .map((item) => item.backlink);

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
