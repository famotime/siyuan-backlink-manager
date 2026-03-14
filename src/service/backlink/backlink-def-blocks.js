import { splitKeywordStringToArray } from "./backlink-markdown.js";

function isArrayEmpty(array) {
  return !array || array.length === 0;
}

function isStrBlank(value) {
  return value === undefined || value === null || value === "";
}

function containsAllKeywords(value, keywords) {
  return keywords.every((keyword) => value.includes(keyword));
}

function removeMarkTags(value = "") {
  return value.replace(/<\/?mark>/g, "");
}

function getFilterStatusSortResult(a, b) {
  if (a.selectionStatus !== b.selectionStatus) {
    if (a.selectionStatus === "SELECTED") {
      return -1;
    }
    if (b.selectionStatus === "SELECTED") {
      return 1;
    }
    if (a.selectionStatus === "EXCLUDED") {
      return -1;
    }
    if (b.selectionStatus === "EXCLUDED") {
      return 1;
    }
  }

  return null;
}

async function searchItemSortByContent(blockArray, getBatchBlockIdIndex) {
  const ids = blockArray.map((item) => item.id);
  const idMap = getBatchBlockIdIndex ? await getBatchBlockIdIndex(ids) : new Map();

  blockArray.sort((a, b) => {
    const statusNum = getFilterStatusSortResult(a, b);
    if (statusNum !== null) {
      return statusNum;
    }

    let result = (idMap.get(a.id) || 0) - (idMap.get(b.id) || 0);
    if (result === 0) {
      result = Number(a.created) - Number(b.created);
    }
    if (result === 0) {
      result = a.sort - b.sort;
    }
    return result;
  });

  return blockArray;
}

async function searchItemSortByTypeAndContent(blockArray, getBatchBlockIdIndex) {
  const ids = blockArray.map((item) => item.id);
  const idMap = getBatchBlockIdIndex ? await getBatchBlockIdIndex(ids) : new Map();

  blockArray.sort((a, b) => {
    const statusNum = getFilterStatusSortResult(a, b);
    if (statusNum !== null) {
      return statusNum;
    }

    let result = a.sort - b.sort;
    if (result === 0) {
      result = (idMap.get(a.id) || 0) - (idMap.get(b.id) || 0);
    }
    if (result === 0) {
      result = Number(b.refCount) - Number(a.refCount);
    }
    return result;
  });

  return blockArray;
}

export function getDefBlockSortFun(contentBlockSortMethod) {
  let blockSortFun;
  switch (contentBlockSortMethod) {
    case "type":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        let result = a.sort - b.sort;
        if (result === 0) {
          result = Number(b.updated) - Number(a.updated);
        }
        return result;
      };
      break;
    case "modifiedAsc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        return Number(a.updated) - Number(b.updated);
      };
      break;
    case "modifiedDesc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        return Number(b.updated) - Number(a.updated);
      };
      break;
    case "createdAsc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        return Number(a.created) - Number(b.created);
      };
      break;
    case "createdDesc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        return Number(b.created) - Number(a.created);
      };
      break;
    case "refCountAsc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        let result = Number(a.refCount) - Number(b.refCount);
        if (result === 0) {
          result = Number(b.updated) - Number(a.updated);
        }
        return result;
      };
      break;
    case "refCountDesc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        let result = Number(b.refCount) - Number(a.refCount);
        if (result === 0) {
          result = Number(b.updated) - Number(a.updated);
        }
        return result;
      };
      break;
    case "alphabeticAsc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        let result = removeMarkTags(a.content).localeCompare(removeMarkTags(b.content), undefined, {
          sensitivity: "base",
          usage: "sort",
          numeric: true,
        });
        if (result === 0) {
          result = Number(b.updated) - Number(a.updated);
        }
        return result;
      };
      break;
    case "alphabeticDesc":
      blockSortFun = (a, b) => {
        const statusNum = getFilterStatusSortResult(a, b);
        if (statusNum !== null) {
          return statusNum;
        }

        let result = removeMarkTags(b.content).localeCompare(removeMarkTags(a.content), undefined, {
          sensitivity: "base",
          usage: "sort",
          numeric: true,
        });
        if (result === 0) {
          result = Number(b.updated) - Number(a.updated);
        }
        return result;
      };
      break;
  }

  return blockSortFun;
}

export async function defBlockArraySort(
  defBlockArray,
  defBlockSortMethod,
  { getBatchBlockIdIndex } = {},
) {
  if (isArrayEmpty(defBlockArray) || !defBlockSortMethod) {
    return;
  }

  if (defBlockSortMethod === "content") {
    await searchItemSortByContent(defBlockArray, getBatchBlockIdIndex);
    return;
  }

  if (defBlockSortMethod === "typeAndContent") {
    await searchItemSortByTypeAndContent(defBlockArray, getBatchBlockIdIndex);
    return;
  }

  const blockSortFun = getDefBlockSortFun(defBlockSortMethod);
  if (blockSortFun) {
    defBlockArray.sort(blockSortFun);
  }
}

export function defBlockArrayTypeAndKeywordFilter(
  defBlockArray,
  defBlockType,
  keywordStr,
) {
  if (isArrayEmpty(defBlockArray)) {
    return;
  }

  for (const defBlock of defBlockArray) {
    defBlock.filterStatus = false;
  }

  if (defBlockType) {
    for (const defBlock of defBlockArray) {
      if (defBlockType === "dynamicAnchorText" && isStrBlank(defBlock.dynamicAnchor)) {
        defBlock.filterStatus = true;
      } else if (
        defBlockType === "staticAnchorText" &&
        isStrBlank(defBlock.staticAnchor)
      ) {
        defBlock.filterStatus = true;
      }
    }
  }

  const keywordArray = splitKeywordStringToArray(keywordStr);
  if (isArrayEmpty(keywordArray)) {
    return;
  }

  for (const defBlock of defBlockArray) {
    const staticAnchor = defBlock.staticAnchor
      ? `${defBlock.staticAnchor}-static- -静态锚文本- -锚- -锚链接-`
      : "";
    const blockContent =
      (defBlock.content || "") +
      (defBlock.name || "") +
      (defBlock.alias || "") +
      (defBlock.memo || "") +
      staticAnchor;
    if (!containsAllKeywords(blockContent, keywordArray)) {
      defBlock.filterStatus = true;
    }
  }
}
