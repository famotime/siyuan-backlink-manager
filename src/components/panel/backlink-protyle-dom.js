export function getProtyleWysiwygElement(element) {
  return element?.querySelector?.("div.protyle-wysiwyg.protyle-wysiwyg--attr");
}

function unfoldBreadcrumbTargetAncestors(targetBlockElement, protyleWysiwygElement) {
  let currentElement = targetBlockElement;
  while (currentElement && currentElement !== protyleWysiwygElement) {
    if (
      currentElement?.getAttribute?.("data-type") === "NodeListItem" &&
      currentElement?.getAttribute?.("fold") === "1"
    ) {
      currentElement.removeAttribute?.("fold");
    }
    currentElement.classList?.remove?.("fn__none");
    currentElement = currentElement.parentElement;
  }
}

export function navigateToBacklinkBreadcrumbBlock(
  protyleContentElement,
  blockId = "",
  {
    documentId = "",
  } = {},
) {
  if (!protyleContentElement || !blockId) {
    return false;
  }

  const protyleWysiwygElement = getProtyleWysiwygElement(protyleContentElement);
  if (!protyleWysiwygElement) {
    return false;
  }

  const targetBlockElement = protyleWysiwygElement.querySelector(
    `[data-node-id="${blockId}"]`,
  );
  if (!targetBlockElement && documentId && blockId === documentId) {
    const firstBlockElement = protyleWysiwygElement.querySelector("[data-node-id]");
    if (!firstBlockElement) {
      return false;
    }

    unfoldBreadcrumbTargetAncestors(firstBlockElement, protyleWysiwygElement);
    firstBlockElement.scrollIntoView?.({
      block: "start",
      inline: "nearest",
    });
    return true;
  }
  if (!targetBlockElement) {
    return false;
  }

  unfoldBreadcrumbTargetAncestors(targetBlockElement, protyleWysiwygElement);
  targetBlockElement.scrollIntoView?.({
    block: "center",
    inline: "nearest",
  });
  return true;
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
    return false;
  }

  const protyleWysiwygElement = getProtyleWysiwygElement(element);
  if (!protyleWysiwygElement) {
    return false;
  }

  let folded = false;
  expandAllListItemNode(element);
  for (const nodeId of idSet) {
    const foldItemElement = protyleWysiwygElement.querySelector(
      `div[data-type="NodeListItem"].li[data-node-id="${nodeId}"]`,
    );
    if (!foldItemElement) {
      continue;
    }
    foldItemElement.setAttribute("fold", "1");
    folded = true;
  }

  return folded;
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
