import {
  getBacklinkSourceWindowByLevel,
  getBacklinkSourceWindowBodyRange,
  getBacklinkSourceWindowOrderedVisibleBlockIds,
} from "../../service/backlink/backlink-source-window.js";
import { getProtyleWysiwygElement } from "./backlink-protyle-dom.js";

export function hideOtherListItemElement(
  backlinkData,
  protyleContentElement,
  queryParams,
  deps,
) {
  const { isSetEmpty, isSetNotEmpty, isArrayNotEmpty } = deps;
  const includeRelatedDefBlockIds = queryParams.includeRelatedDefBlockIds;
  const excludeRelatedDefBlockIds = queryParams.excludeRelatedDefBlockIds;

  if (
    isSetEmpty(includeRelatedDefBlockIds) &&
    isSetEmpty(excludeRelatedDefBlockIds)
  ) {
    return;
  }

  const targetBlockParentElement = protyleContentElement.querySelector(
    `div[data-node-id='${backlinkData.backlinkBlock.id}']`,
  )?.parentElement;
  if (!targetBlockParentElement?.matches?.('div[data-type="NodeListItem"]')) {
    return;
  }

  if (
    isSetNotEmpty(includeRelatedDefBlockIds) &&
    isArrayNotEmpty(backlinkData.includeChildListItemIdArray)
  ) {
    const allListItemElement = targetBlockParentElement.querySelectorAll(
      'div[data-type="NodeListItem"]',
    );
    for (const itemElement of allListItemElement) {
      itemElement.classList.add("fn__none");
    }
    for (const itemId of backlinkData.includeChildListItemIdArray) {
      const targetElement = targetBlockParentElement.querySelector(
        `div[data-type="NodeListItem"][data-node-id="${itemId}"]`,
      );
      targetElement?.classList.remove("fn__none");
    }
  }

  if (
    isSetNotEmpty(excludeRelatedDefBlockIds) &&
    isArrayNotEmpty(backlinkData.excludeChildLisetItemIdArray)
  ) {
    for (const itemId of backlinkData.excludeChildLisetItemIdArray) {
      const targetElement = targetBlockParentElement.querySelector(
        `div[data-type="NodeListItem"][data-node-id="${itemId}"]`,
      );
      targetElement?.classList.add("fn__none");
    }
  }
}

function getSourceWindowWindowBlockIds(sourceWindow = null) {
  return getBacklinkSourceWindowBodyRange(sourceWindow)?.windowBlockIds || [];
}

function collectVisibleBlockIdsWithAncestors(
  visibleBlockIdSet,
  blockElementArray = [],
  protyleWysiwygElement,
) {
  if (!protyleWysiwygElement || !(visibleBlockIdSet instanceof Set)) {
    return visibleBlockIdSet;
  }

  const blockElementMap = new Map();
  for (const blockElement of blockElementArray) {
    const blockId = blockElement?.getAttribute?.("data-node-id");
    if (!blockId) {
      continue;
    }
    blockElementMap.set(blockId, blockElement);
  }

  const expandedVisibleBlockIdSet = new Set(visibleBlockIdSet);
  for (const blockId of visibleBlockIdSet) {
    let currentElement = blockElementMap.get(blockId)?.parentElement;
    while (currentElement && currentElement !== protyleWysiwygElement) {
      const currentBlockId = currentElement?.getAttribute?.("data-node-id");
      if (currentBlockId) {
        expandedVisibleBlockIdSet.add(currentBlockId);
      }
      currentElement = currentElement.parentElement;
    }
  }

  return expandedVisibleBlockIdSet;
}

function collectVisibleBlockIdsFromExpandedListShells(
  sourceWindow = null,
  blockElementArray = [],
) {
  const visibleBlockIds = getBacklinkSourceWindowOrderedVisibleBlockIds(sourceWindow);
  const windowBlockIdSet = new Set(
    getSourceWindowWindowBlockIds(sourceWindow),
  );
  if (visibleBlockIds.length <= 0 || windowBlockIdSet.size <= 0) {
    return new Set();
  }

  const blockElementMap = new Map();
  for (const blockElement of blockElementArray) {
    const blockId = blockElement?.getAttribute?.("data-node-id");
    if (!blockId) {
      continue;
    }
    blockElementMap.set(blockId, blockElement);
  }

  const expandedVisibleBlockIdSet = new Set();
  for (const blockId of visibleBlockIds) {
    const blockElement = blockElementMap.get(blockId);
    const blockType = blockElement?.getAttribute?.("data-type");
    if (
      !blockElement ||
      (blockType !== "NodeListItem" && blockType !== "NodeList") ||
      blockElement?.getAttribute?.("fold") === "1"
    ) {
      continue;
    }

    const descendantBlockElements =
      blockElement.querySelectorAll?.("[data-node-id]") || [];
    for (const descendantBlockElement of descendantBlockElements) {
      const descendantBlockId =
        descendantBlockElement?.getAttribute?.("data-node-id");
      if (!descendantBlockId) {
        continue;
      }
      if (windowBlockIdSet.has(descendantBlockId)) {
        expandedVisibleBlockIdSet.add(descendantBlockId);
      }
    }
  }

  return expandedVisibleBlockIdSet;
}

function unfoldVisibleListItemAncestors(
  visibleBlockIdSet,
  blockElementArray = [],
  protyleWysiwygElement,
) {
  if (!protyleWysiwygElement || !(visibleBlockIdSet instanceof Set)) {
    return;
  }

  const blockElementMap = new Map();
  for (const blockElement of blockElementArray) {
    const blockId = blockElement?.getAttribute?.("data-node-id");
    if (!blockId) {
      continue;
    }
    blockElementMap.set(blockId, blockElement);
  }

  const unfoldListItemElement = (element) => {
    if (element?.getAttribute?.("data-type") !== "NodeListItem") {
      return;
    }
    if (element?.getAttribute?.("fold") === "1") {
      element.removeAttribute?.("fold");
    }
  };

  for (const blockId of visibleBlockIdSet) {
    let currentElement = blockElementMap.get(blockId);
    while (currentElement && currentElement !== protyleWysiwygElement) {
      unfoldListItemElement(currentElement);
      currentElement = currentElement.parentElement;
    }
  }
}

export function hideBlocksOutsideBacklinkSourceWindow(
  backlinkData,
  protyleContentElement,
  contextVisibilityLevel = "core",
) {
  const sourceWindow = getBacklinkSourceWindowByLevel(
    backlinkData,
    contextVisibilityLevel,
  );
  const windowBlockIds = getSourceWindowWindowBlockIds(sourceWindow);
  if (!Array.isArray(windowBlockIds) || windowBlockIds.length <= 0) {
    return;
  }

  const protyleWysiwygElement = getProtyleWysiwygElement(protyleContentElement);
  if (!protyleWysiwygElement) {
    return;
  }

  const getBlockElementArray = () =>
    protyleWysiwygElement.querySelectorAll("[data-node-id]");
  let blockElementArray = getBlockElementArray();
  const visibleBlockIds = getSourceWindowWindowBlockIds(sourceWindow);
  const seedVisibleBlockIdSet = collectVisibleBlockIdsWithAncestors(
    new Set(visibleBlockIds),
    blockElementArray,
    protyleWysiwygElement,
  );
  unfoldVisibleListItemAncestors(
    seedVisibleBlockIdSet,
    blockElementArray,
    protyleWysiwygElement,
  );
  blockElementArray = getBlockElementArray();
  const visibleBlockIdSet = collectVisibleBlockIdsWithAncestors(
    new Set([
      ...seedVisibleBlockIdSet,
      ...collectVisibleBlockIdsFromExpandedListShells(
        sourceWindow,
        blockElementArray,
      ),
    ]),
    blockElementArray,
    protyleWysiwygElement,
  );
  unfoldVisibleListItemAncestors(
    visibleBlockIdSet,
    blockElementArray,
    protyleWysiwygElement,
  );
  blockElementArray = getBlockElementArray();
  for (const blockElement of blockElementArray) {
    const blockId = blockElement?.getAttribute?.("data-node-id");
    if (!blockId) {
      continue;
    }

    if (visibleBlockIdSet.has(blockId)) {
      blockElement.classList?.remove?.("fn__none");
      continue;
    }
    blockElement.classList?.add?.("fn__none");
  }
}
