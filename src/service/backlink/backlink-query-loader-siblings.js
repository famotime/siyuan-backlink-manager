import {
  getSiblingOrderMapByParentId,
  sortBlocksByParentSiblingOrder,
} from "./backlink-source-window-ordering.js";

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

async function enrichSiblingListItemBlocks(siblingBlockArray = [], deps) {
  const {
    generateGetListItemSubMarkdownArraySql,
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
  if (listItemIdSet.size <= 0 || !generateGetListItemSubMarkdownArraySql) {
    return;
  }

  const subMarkdownSql = generateGetListItemSubMarkdownArraySql(
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

  const siblingBlockById = new Map(
    siblingBlockArray
      .filter((item) => item?.id)
      .map((item) => [item.id, item]),
  );
  await Promise.all(
    Array.from(listItemIdSet).map(async (listItemId) => {
      const result = await getBlockKramdown(listItemId);
      const renderMarkdown = result?.kramdown || "";
      if (!renderMarkdown) {
        return;
      }

      const siblingBlock = siblingBlockById.get(listItemId);
      if (siblingBlock) {
        siblingBlock.renderMarkdown = renderMarkdown;
      }
    }),
  );
}

export async function getSiblingBlockGroupArray(queryParams, deps) {
  const {
    generateGetBacklinkSiblingBlockArraySql,
    generateGetListItemSubMarkdownArraySql,
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
    generateGetListItemSubMarkdownArraySql,
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

  // 仅对存在多个兄弟的父块查询真实子块顺序
  const candidateParentIds = Array.from(parentSiblingMap.entries())
    .filter(([, siblingList]) => siblingList.length > 1)
    .map(([parentId]) => parentId);
  const siblingOrderMapByParentId = await getSiblingOrderMapByParentId(candidateParentIds, {
    getChildBlocks,
  });
  for (const [parentId, siblingList] of parentSiblingMap.entries()) {
    sortBlocksByParentSiblingOrder(parentId, siblingList, siblingOrderMapByParentId);
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
