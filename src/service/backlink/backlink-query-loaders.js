export async function getBacklinkBlockArray(queryParams, deps) {
  const {
    generateGetBacklinkListItemBlockArraySql,
    generateGetBacklinkBlockArraySql,
    sql,
  } = deps;

  if (!queryParams) {
    return [];
  }

  const query = queryParams.querrChildDefBlockForListItem
    ? generateGetBacklinkListItemBlockArraySql(queryParams)
    : generateGetBacklinkBlockArraySql(queryParams);
  return (await sql(query)) || [];
}

export async function getHeadlineChildBlockArray(queryParams, deps) {
  const {
    generateGetHeadlineChildDefBlockArraySql,
    sql,
    isArrayEmpty,
  } = deps;

  if (
    !queryParams ||
    !queryParams.queryChildDefBlockForHeadline ||
    isArrayEmpty(queryParams.backlinkBlocks)
  ) {
    return [];
  }

  const headlineBacklinkIdArray = [];
  for (const backlinkBlock of queryParams.backlinkBlocks) {
    if (backlinkBlock.type === "h") {
      headlineBacklinkIdArray.push(backlinkBlock.id);
    }
  }
  if (isArrayEmpty(headlineBacklinkIdArray)) {
    return [];
  }

  const headlineChildBlockArray =
    (await sql(generateGetHeadlineChildDefBlockArraySql(queryParams))) || [];
  return headlineChildBlockArray.filter((childBlock) =>
    childBlock.parentIdPath.includes("->"),
  );
}

export async function getListItemChildBlockArray(queryParams, deps) {
  const {
    generateGetListItemChildBlockArraySql,
    generateGetListItemtSubMarkdownArraySql,
    sql,
    isSetEmpty,
    isStrNotBlank,
  } = deps;

  if (!queryParams || !queryParams.querrChildDefBlockForListItem) {
    return [];
  }

  const backlinkParentListItemBlockIds = new Set();
  if (queryParams.backlinkBlocks) {
    for (const backlinkBlock of queryParams.backlinkBlocks) {
      if (backlinkBlock && backlinkBlock.parentBlockType === "i") {
        backlinkParentListItemBlockIds.add(backlinkBlock.parent_id);
      }
    }
  }
  if (isSetEmpty(backlinkParentListItemBlockIds)) {
    return [];
  }

  queryParams.backlinkParentListItemBlockIds = Array.from(backlinkParentListItemBlockIds);
  let listItemChildBlockArray =
    (await sql(generateGetListItemChildBlockArraySql(queryParams))) || [];

  if (listItemChildBlockArray.length > 0) {
    const listItemIdSet = new Set();
    for (const itemBlock of listItemChildBlockArray) {
      if (itemBlock.type === "i") {
        listItemIdSet.add(itemBlock.id);
      }
    }

    const subMarkdownSql = generateGetListItemtSubMarkdownArraySql(
      Array.from(listItemIdSet),
    );
    if (isStrNotBlank(subMarkdownSql)) {
      const subMarkdownArray = (await sql(subMarkdownSql)) || [];
      const parentInAttrMap = new Map();
      const subMarkdownMap = new Map();
      const subInAttrMap = new Map();

      for (const parentListItemBlock of subMarkdownArray) {
        parentInAttrMap.set(
          parentListItemBlock.parent_id,
          parentListItemBlock.parentInAttrConcat,
        );
        subMarkdownMap.set(parentListItemBlock.parent_id, parentListItemBlock.subMarkdown);
        subInAttrMap.set(
          parentListItemBlock.parent_id,
          parentListItemBlock.subInAttrConcat,
        );
      }

      for (const itemBlock of listItemChildBlockArray) {
        if (itemBlock.type !== "i") {
          continue;
        }
        const subMarkdown = subMarkdownMap.get(itemBlock.id);
        if (!subMarkdown) {
          continue;
        }
        itemBlock.parentInAttrConcat = parentInAttrMap.get(itemBlock.id);
        itemBlock.subMarkdown = subMarkdown;
        itemBlock.subInAttrConcat = subInAttrMap.get(itemBlock.id);
      }
    }
  }

  return listItemChildBlockArray;
}

export async function getParentBlockArray(queryParams, deps) {
  const {
    generateGetParentDefBlockArraySql,
    generateGetParenListItemtDefBlockArraySql,
    sql,
    countOccurrences,
    isSetNotEmpty,
  } = deps;

  if (!queryParams || !queryParams.queryParentDefBlock) {
    return [];
  }

  const parentBlockArray =
    (await sql(generateGetParentDefBlockArraySql(queryParams))) || [];
  const backlinkParentListItemBlockIdSet = new Set();

  for (const parentBlock of parentBlockArray) {
    if (parentBlock.type === "i") {
      const count = countOccurrences(parentBlock.childIdPath, "->");
      if (count > 2) {
        backlinkParentListItemBlockIdSet.add(parentBlock.id);
      }
    }
  }

  if (isSetNotEmpty(backlinkParentListItemBlockIdSet)) {
    queryParams.backlinkAllParentBlockIds = Array.from(backlinkParentListItemBlockIdSet);
    const subMarkdownArray =
      (await sql(generateGetParenListItemtDefBlockArraySql(queryParams))) || [];
    const subMarkdownMap = new Map();

    for (const parentListItemBlock of subMarkdownArray) {
      subMarkdownMap.set(
        parentListItemBlock.parent_id,
        parentListItemBlock.subMarkdown + parentListItemBlock.inAttrConcat,
      );
    }

    for (const parentBlock of parentBlockArray) {
      if (parentBlock.type !== "i") {
        continue;
      }
      const subMarkdown = subMarkdownMap.get(parentBlock.id);
      if (subMarkdown) {
        parentBlock.subMarkdown = subMarkdown;
      }
    }
  }

  return parentBlockArray;
}

function sortSiblingBlocks(blockArray = []) {
  blockArray.sort((a, b) => {
    const sortA = Number(a?.sort ?? 0);
    const sortB = Number(b?.sort ?? 0);
    if (sortA !== sortB) {
      return sortA - sortB;
    }

    const pathA = String(a?.path ?? "");
    const pathB = String(b?.path ?? "");
    const pathResult = pathA.localeCompare(pathB);
    if (pathResult !== 0) {
      return pathResult;
    }

    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
}

function buildExpandedSiblingBlocks(siblingList = [], currentIndex = -1) {
  if (!Array.isArray(siblingList) || currentIndex < 0) {
    return { beforeSiblingBlocks: [], afterSiblingBlocks: [] };
  }

  return {
    beforeSiblingBlocks: siblingList.slice(0, Math.max(currentIndex - 1, 0)),
    afterSiblingBlocks: siblingList.slice(currentIndex + 2),
  };
}

function getSiblingParentId(backlinkBlock) {
  if (backlinkBlock?.parentBlockType === "i") {
    return backlinkBlock.parentListItemParentId || backlinkBlock.parent_id;
  }
  return backlinkBlock?.parent_id;
}

function getSiblingCurrentBlockId(backlinkBlock) {
  if (backlinkBlock?.parentBlockType === "i") {
    return backlinkBlock.parent_id;
  }
  return backlinkBlock?.id;
}

async function getSiblingOrderMapByParentId(parentSiblingMap = new Map(), deps = {}) {
  const { getChildBlocks } = deps;
  if (typeof getChildBlocks !== "function") {
    return new Map();
  }

  const siblingOrderMapByParentId = new Map();
  await Promise.all(
    Array.from(parentSiblingMap.entries()).map(async ([parentId, siblingList]) => {
      if (!parentId || !Array.isArray(siblingList) || siblingList.length <= 0) {
        return;
      }
      if (!siblingList.every((block) => block?.type === "i")) {
        return;
      }

      const childBlocks = await getChildBlocks(parentId);
      if (!Array.isArray(childBlocks) || childBlocks.length <= 0) {
        return;
      }

      const siblingOrderMap = new Map();
      childBlocks.forEach((childBlock, index) => {
        if (childBlock?.id) {
          siblingOrderMap.set(childBlock.id, index);
        }
      });
      if (siblingOrderMap.size > 0) {
        siblingOrderMapByParentId.set(parentId, siblingOrderMap);
      }
    }),
  );

  return siblingOrderMapByParentId;
}

function sortSiblingBlocksByParent(parentId, blockArray = [], siblingOrderMapByParentId = new Map()) {
  const siblingOrderMap = siblingOrderMapByParentId.get(parentId);
  if (!siblingOrderMap || siblingOrderMap.size <= 0) {
    sortSiblingBlocks(blockArray);
    return;
  }

  blockArray.sort((a, b) => {
    const orderA = siblingOrderMap.has(a?.id) ? siblingOrderMap.get(a.id) : Infinity;
    const orderB = siblingOrderMap.has(b?.id) ? siblingOrderMap.get(b.id) : Infinity;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
}

async function enrichSiblingListItemBlocks(siblingBlockArray = [], deps) {
  const {
    generateGetListItemtSubMarkdownArraySql,
    getBlockKramdown,
    sql,
    isStrNotBlank,
  } = deps;

  const listItemIdSet = new Set();
  for (const siblingBlock of siblingBlockArray) {
    if (siblingBlock?.type === "i") {
      listItemIdSet.add(siblingBlock.id);
    }
  }
  if (listItemIdSet.size <= 0 || !generateGetListItemtSubMarkdownArraySql) {
    return;
  }

  const subMarkdownSql = generateGetListItemtSubMarkdownArraySql(
    Array.from(listItemIdSet),
  );
  if (!isStrNotBlank?.(subMarkdownSql)) {
    return;
  }

  const subMarkdownArray = (await sql(subMarkdownSql)) || [];
  const parentInAttrMap = new Map();
  const subMarkdownMap = new Map();
  const subInAttrMap = new Map();

  for (const parentListItemBlock of subMarkdownArray) {
    parentInAttrMap.set(
      parentListItemBlock.parent_id,
      parentListItemBlock.parentInAttrConcat,
    );
    subMarkdownMap.set(parentListItemBlock.parent_id, parentListItemBlock.subMarkdown);
    subInAttrMap.set(
      parentListItemBlock.parent_id,
      parentListItemBlock.subInAttrConcat,
    );
  }

  for (const siblingBlock of siblingBlockArray) {
    if (siblingBlock?.type !== "i") {
      continue;
    }
    siblingBlock.parentInAttrConcat = parentInAttrMap.get(siblingBlock.id);
    siblingBlock.subMarkdown = subMarkdownMap.get(siblingBlock.id);
    siblingBlock.subInAttrConcat = subInAttrMap.get(siblingBlock.id);
  }

  if (typeof getBlockKramdown !== "function") {
    return;
  }

  await Promise.all(
    Array.from(listItemIdSet).map(async (listItemId) => {
      const result = await getBlockKramdown(listItemId);
      const renderMarkdown = result?.kramdown || "";
      if (!renderMarkdown) {
        return;
      }

      const siblingBlock = siblingBlockArray.find((item) => item?.id === listItemId);
      if (siblingBlock) {
        siblingBlock.renderMarkdown = renderMarkdown;
      }
    }),
  );
}

export async function getSiblingBlockGroupArray(queryParams, deps) {
  const {
    generateGetBacklinkSiblingBlockArraySql,
    generateGetListItemtSubMarkdownArraySql,
    getBlockKramdown,
    getChildBlocks,
    sql,
    isArrayEmpty,
    isStrNotBlank,
  } = deps;

  if (!queryParams || isArrayEmpty(queryParams.backlinkBlocks)) {
    return [];
  }

  const siblingBlockArray =
    (await sql(generateGetBacklinkSiblingBlockArraySql(queryParams))) || [];
  if (isArrayEmpty(siblingBlockArray)) {
    return [];
  }

  await enrichSiblingListItemBlocks(siblingBlockArray, {
    generateGetListItemtSubMarkdownArraySql,
    getBlockKramdown,
    sql,
    isStrNotBlank,
  });

  const parentSiblingMap = new Map();
  for (const siblingBlock of siblingBlockArray) {
    if (!siblingBlock?.parent_id) {
      continue;
    }

    let siblingList = parentSiblingMap.get(siblingBlock.parent_id);
    if (!siblingList) {
      siblingList = [];
      parentSiblingMap.set(siblingBlock.parent_id, siblingList);
    }
    siblingList.push(siblingBlock);
  }

  const siblingOrderMapByParentId = await getSiblingOrderMapByParentId(parentSiblingMap, {
    getChildBlocks,
  });
  for (const [parentId, siblingList] of parentSiblingMap.entries()) {
    sortSiblingBlocksByParent(parentId, siblingList, siblingOrderMapByParentId);
  }

  const backlinkSiblingBlockGroupArray = [];
  for (const backlinkBlock of queryParams.backlinkBlocks) {
    const siblingParentId = getSiblingParentId(backlinkBlock);
    const siblingCurrentBlockId = getSiblingCurrentBlockId(backlinkBlock);
    const siblingList = parentSiblingMap.get(siblingParentId);
    if (isArrayEmpty(siblingList) || siblingList.length <= 1) {
      continue;
    }

    const currentIndex = siblingList.findIndex((item) => item.id === siblingCurrentBlockId);
    if (currentIndex < 0) {
      continue;
    }

    const currentSiblingBlock = siblingList[currentIndex] || null;
    const previousSiblingBlock = siblingList[currentIndex - 1] || null;
    const nextSiblingBlock = siblingList[currentIndex + 1] || null;
    const { beforeSiblingBlocks, afterSiblingBlocks } = buildExpandedSiblingBlocks(
      siblingList,
      currentIndex,
    );
    const expandedSiblingBlocks = [...beforeSiblingBlocks, ...afterSiblingBlocks];
    if (
      !previousSiblingBlock &&
      !nextSiblingBlock &&
      beforeSiblingBlocks.length <= 0 &&
      afterSiblingBlocks.length <= 0
    ) {
      continue;
    }

    backlinkSiblingBlockGroupArray.push({
      backlinkBlockId: backlinkBlock.id,
      currentSiblingBlock,
      previousSiblingBlock,
      nextSiblingBlock,
      beforeSiblingBlocks,
      afterSiblingBlocks,
      expandedSiblingBlocks,
    });
  }

  return backlinkSiblingBlockGroupArray;
}

export async function getBlockInfoMap(blockIds, deps) {
  const { generateGetBlockArraySql, sql } = deps;
  const blockArray = (await sql(generateGetBlockArraySql(blockIds))) || [];
  const blockMap = new Map();
  for (const block of blockArray) {
    blockMap.set(block.id, block);
  }
  return blockMap;
}

export async function getBacklinkEmbedBlockInfo(
  backlinkBlock,
  curDocDefBlockArray,
  deps,
) {
  const {
    sql,
    generateGetChildBlockArraySql,
    getQueryStrByBlock,
    isArrayNotEmpty,
    isStrNotBlank,
  } = deps;

  let embedBlockmarkdown = "";
  const relatedDefBlockIdArray = [];

  for (const defBlock of curDocDefBlockArray) {
    if (
      !defBlock ||
      !isStrNotBlank(defBlock.backlinkBlockIdConcat) ||
      !defBlock.backlinkBlockIdConcat.includes(backlinkBlock.id)
    ) {
      continue;
    }

    relatedDefBlockIdArray.push(defBlock.id);
    embedBlockmarkdown += defBlock.markdown;
    let embedChildblockArray = null;

    if (defBlock.type === "d") {
      embedChildblockArray = await sql(
        `SELECT * FROM blocks WHERE root_id = '${defBlock.id}'`,
      );
    } else if (defBlock.type === "h") {
      embedChildblockArray = await sql(
        generateGetChildBlockArraySql(defBlock.root_id, defBlock.id),
      );
    } else if (defBlock.type === "query_embed") {
      embedChildblockArray = await sql(
        defBlock.markdown.replace("{{", "").replace("}}", ""),
      );
    }

    if (isArrayNotEmpty(embedChildblockArray)) {
      for (const block of embedChildblockArray) {
        embedBlockmarkdown += getQueryStrByBlock(block);
      }
    }
  }

  return { embedBlockmarkdown, relatedDefBlockIdArray };
}
