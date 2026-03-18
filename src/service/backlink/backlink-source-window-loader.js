import {
  buildTreeOrderedBlocks,
  compareBlocksByDocumentOrder,
  getKramdownOrderMapByRootId,
  getSiblingOrderMapByParentId,
  hasCompleteDocumentOrder,
} from "./backlink-source-window-ordering.js";

function buildSourceWindowRootIds(backlinkDataArray = []) {
  const rootIdSet = new Set();
  for (const backlinkData of backlinkDataArray) {
    const rootId = backlinkData?.backlinkBlock?.root_id;
    if (rootId) {
      rootIdSet.add(rootId);
    }
  }
  return Array.from(rootIdSet);
}

export function generateBacklinkSourceWindowBlockArraySql(rootIdArray = []) {
  if (!Array.isArray(rootIdArray) || rootIdArray.length <= 0) {
    return "";
  }

  const rootIdListSql = rootIdArray.map((rootId) => `'${rootId}'`).join(", ");
  return `SELECT * FROM blocks WHERE root_id IN (${rootIdListSql}) AND type != 'd' LIMIT 999999999;`;
}

export async function loadOrderedBacklinkSourceWindowBlocks({
  backlinkDataArray = [],
  deps = {},
} = {}) {
  const {
    queryDocumentBlocksByRootIds,
    getBlockIndexMap,
    getChildBlocks,
    getBlockKramdown,
  } = deps;
  const rootIdArray = buildSourceWindowRootIds(backlinkDataArray);
  if (
    rootIdArray.length <= 0 ||
    typeof queryDocumentBlocksByRootIds !== "function"
  ) {
    return new Map();
  }

  const documentBlockArray =
    (await queryDocumentBlocksByRootIds(rootIdArray)) || [];
  if (!Array.isArray(documentBlockArray) || documentBlockArray.length <= 0) {
    return new Map();
  }

  const indexMap =
    typeof getBlockIndexMap === "function"
      ? await getBlockIndexMap(documentBlockArray.map((block) => block.id))
      : new Map();
  const orderedBlocksByRootId = new Map();

  for (const block of documentBlockArray) {
    const rootId = block?.root_id;
    if (!rootId) {
      continue;
    }

    let blockArray = orderedBlocksByRootId.get(rootId);
    if (!blockArray) {
      blockArray = [];
      orderedBlocksByRootId.set(rootId, blockArray);
    }
    blockArray.push(block);
  }

  const incompleteRootIdArray = Array.from(orderedBlocksByRootId.entries())
    .filter(([, blockArray]) => !hasCompleteDocumentOrder(blockArray, indexMap))
    .map(([rootId]) => rootId);
  const kramdownOrderMapByRootId = await getKramdownOrderMapByRootId(
    incompleteRootIdArray,
    { getBlockKramdown },
  );

  for (const [rootId, blockArray] of orderedBlocksByRootId.entries()) {
    const hasFullDocumentOrder = hasCompleteDocumentOrder(blockArray, indexMap);
    if (hasFullDocumentOrder) {
      blockArray.forEach((block) => {
        block.__backlinkSourceDocumentOrder = indexMap.get(block.id);
      });
      blockArray.sort((blockA, blockB) =>
        compareBlocksByDocumentOrder(blockA, blockB, indexMap),
      );
      continue;
    }

    const kramdownOrderMap = kramdownOrderMapByRootId.get(rootId) || new Map();
    const fallbackIndexMap = new Map();
    for (const block of blockArray) {
      const explicitIndex = indexMap.get(block.id);
      if (Number.isFinite(explicitIndex)) {
        fallbackIndexMap.set(block.id, explicitIndex);
        continue;
      }
      const kramdownIndex = kramdownOrderMap.get(block.id);
      if (Number.isFinite(kramdownIndex)) {
        fallbackIndexMap.set(block.id, kramdownIndex);
      }
    }

    const siblingOrderMapByParentId = await getSiblingOrderMapByParentId(blockArray, {
      getChildBlocks,
    });
    const orderedBlocks = buildTreeOrderedBlocks(
      blockArray,
      rootId,
      fallbackIndexMap,
      siblingOrderMapByParentId,
    );
    orderedBlocks.forEach((block, order) => {
      block.__backlinkSourceDocumentOrder = order;
    });
    blockArray.length = 0;
    blockArray.push(...orderedBlocks);
  }

  return orderedBlocksByRootId;
}
