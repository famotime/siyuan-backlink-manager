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
