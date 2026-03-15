function getProtyleWysiwygElement(element) {
  return element?.querySelector?.("div.protyle-wysiwyg.protyle-wysiwyg--attr");
}

export function expandAllListItemNode(element) {
  const protyleWysiwygElement = getProtyleWysiwygElement(element);
  if (!protyleWysiwygElement) {
    return;
  }

  const liNodes = protyleWysiwygElement.querySelectorAll(
    'div[data-type="NodeListItem"].li[fold="1"]',
  );
  liNodes.forEach((node) => {
    node.removeAttribute("fold");
  });
}

export function foldListItemNodeByIdSet(element, idSet) {
  if (!element || !idSet) {
    return;
  }

  const protyleWysiwygElement = getProtyleWysiwygElement(element);
  if (!protyleWysiwygElement) {
    return;
  }

  expandAllListItemNode(element);
  for (const nodeId of idSet) {
    const foldItemElement = protyleWysiwygElement.querySelector(
      `div[data-type="NodeListItem"].li[data-node-id="${nodeId}"]`,
    );
    if (!foldItemElement) {
      continue;
    }
    foldItemElement.setAttribute("fold", "1");
  }
}

export function expandListItemNodeByDepth(element, depth, deps) {
  if (!element || depth < 1) {
    return;
  }

  const { getElementsBeforeDepth, getElementsAtDepth, syHasChildListNode } = deps;
  const protyleWysiwygElement = getProtyleWysiwygElement(element);
  if (!protyleWysiwygElement) {
    return;
  }

  const targetDepth = depth - 1;
  const liNodes = getElementsBeforeDepth(
    protyleWysiwygElement,
    'div[data-type="NodeListItem"].li',
    targetDepth,
  );
  liNodes.forEach((node) => {
    node.removeAttribute("fold");
  });

  const collapseLiNodes = getElementsAtDepth(
    protyleWysiwygElement,
    'div[data-type="NodeListItem"].li',
    targetDepth,
  );
  collapseLiNodes.forEach((node) => {
    if (syHasChildListNode(node)) {
      node.setAttribute("fold", "1");
    }
  });
}

export function collapseAllListItemNode(element, deps) {
  if (!element) {
    return;
  }

  const { syHasChildListNode } = deps;
  const protyleWysiwygElement = getProtyleWysiwygElement(element);
  if (!protyleWysiwygElement) {
    return;
  }

  const liNodes = protyleWysiwygElement.querySelectorAll(
    'div[data-type="NodeListItem"].li:not([fold])',
  );
  liNodes.forEach((node) => {
    if (syHasChildListNode(node)) {
      node.setAttribute("fold", "1");
    }
  });
}

export function expandBacklinkHeadingMore(element) {
  if (!element) {
    return;
  }

  const protyleWysiwygElement = getProtyleWysiwygElement(element);
  if (!protyleWysiwygElement) {
    return;
  }

  const moreElement = protyleWysiwygElement.querySelector(
    "div.protyle-breadcrumb__item",
  );
  if (!moreElement) {
    return;
  }

  let nextElement = moreElement.nextElementSibling;
  while (
    nextElement &&
    !nextElement.classList.contains("protyle-breadcrumb__bar")
  ) {
    nextElement.classList.remove("fn__none");
    nextElement = nextElement.nextElementSibling;
  }
  moreElement.remove();
}

export function captureBacklinkProtyleState(editor) {
  if (!editor?.protyle?.contentElement) {
    return null;
  }

  const documentLiElement =
    editor.protyle.contentElement.parentElement?.previousElementSibling;
  if (!documentLiElement) {
    return null;
  }

  const backlinkBlockId = documentLiElement.getAttribute("data-backlink-block-id");
  const backlinkRootId = documentLiElement.getAttribute("data-node-id");
  const isFolded = documentLiElement.classList.contains("backlink-hide");
  const protyleWysiwygElement = editor.protyle.contentElement.querySelector(
    "div.protyle-wysiwyg",
  );
  const foldedItemIds = [];
  let expandHeadingMore = false;

  if (protyleWysiwygElement) {
    const foldItemElementArray = protyleWysiwygElement.querySelectorAll(
      'div[data-type="NodeListItem"].li[fold="1"]',
    );
    for (const itemElement of foldItemElementArray) {
      foldedItemIds.push(itemElement.getAttribute("data-node-id"));
    }
    expandHeadingMore = !Boolean(
      protyleWysiwygElement.querySelector("div.protyle-breadcrumb__item use"),
    );
  }

  return {
    backlinkBlockId,
    backlinkRootId,
    isFolded,
    foldedItemIds,
    expandHeadingMore,
  };
}

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

function getBacklinkSourceWindowByLevel(backlinkData, contextVisibilityLevel = "core") {
  if (!backlinkData) {
    return null;
  }

  const sourceWindows = backlinkData.sourceWindows;
  if (sourceWindows && sourceWindows[contextVisibilityLevel]) {
    return sourceWindows[contextVisibilityLevel];
  }

  if (contextVisibilityLevel === "extended") {
    return backlinkData.sourceWindow || null;
  }

  return null;
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

function collectVisibleBlockIdsWithDescendants(
  visibleBlockIdSet,
  blockElementArray = [],
) {
  if (!(visibleBlockIdSet instanceof Set)) {
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
    const blockElement = blockElementMap.get(blockId);
    if (!blockElement) {
      continue;
    }

    const descendantBlockElements =
      blockElement.querySelectorAll?.("[data-node-id]") || [];
    for (const descendantBlockElement of descendantBlockElements) {
      const descendantBlockId =
        descendantBlockElement?.getAttribute?.("data-node-id");
      if (descendantBlockId) {
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
  const windowBlockIds = sourceWindow?.windowBlockIds;
  if (!Array.isArray(windowBlockIds) || windowBlockIds.length <= 0) {
    return;
  }

  const protyleWysiwygElement = getProtyleWysiwygElement(protyleContentElement);
  if (!protyleWysiwygElement) {
    return;
  }

  const blockElementArray = protyleWysiwygElement.querySelectorAll("[data-node-id]");
  const visibleBlockIdSet = collectVisibleBlockIdsWithAncestors(
    collectVisibleBlockIdsWithDescendants(
      new Set(windowBlockIds),
      blockElementArray,
    ),
    blockElementArray,
    protyleWysiwygElement,
  );
  unfoldVisibleListItemAncestors(
    visibleBlockIdSet,
    blockElementArray,
    protyleWysiwygElement,
  );
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
