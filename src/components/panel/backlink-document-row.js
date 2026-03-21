import { getBacklinkContextLevelLabel } from "./backlink-panel-header.js";

const BACKLINK_CONTEXT_LEVEL_ORDER = ["core", "nearby", "extended", "full"];
const BACKLINK_DOCUMENT_TITLE_TOOLTIP =
  "左键在主窗口打开文档，右键在右侧打开文档，Ctrl+左键跟随当前焦点打开文档";

function normalizeBacklinkContextControlState(contextControlState = {}) {
  const contextVisibilityLevel =
    contextControlState.contextVisibilityLevel || "core";
  return {
    contextVisibilityLevel,
    levelLabel: getBacklinkContextLevelLabel(contextVisibilityLevel),
    budgetHint: contextControlState.budgetHint || "",
    previousDisabled: contextControlState.previousDisabled === true,
    nextDisabled: contextControlState.nextDisabled === true,
  };
}

function getBacklinkContextStateLevelFromTarget(target) {
  if (!target || typeof target.closest !== "function") {
    return "";
  }

  return (
    target.closest(".backlink-context-state")?.getAttribute("data-context-level") ||
    ""
  );
}

function normalizeBacklinkBreadcrumbItemType(type = "") {
  const normalizedType = String(type || "").trim();
  if (!normalizedType) {
    return "";
  }

  const typeMap = {
    NodeDocument: "d",
    NodeHeading: "h",
    NodeList: "l",
    NodeListItem: "i",
    NodeParagraph: "p",
    NodeBlockquote: "b",
    NodeTable: "t",
    NodeCodeBlock: "c",
  };
  return typeMap[normalizedType] || normalizedType;
}

function createBacklinkBreadcrumbItem(blockPath = {}) {
  const label = String(blockPath?.name || "").trim();
  if (!label) {
    return null;
  }

  return {
    id: String(blockPath?.id || "").trim(),
    label,
    type: normalizeBacklinkBreadcrumbItemType(blockPath?.type),
    subType: String(blockPath?.subType || "").trim(),
    clickable: Boolean(String(blockPath?.id || "").trim()),
  };
}

function findBacklinkBreadcrumbTrail(
  blockPaths = [],
  targetBlockIdSet = new Set(),
) {
  for (const blockPath of blockPaths || []) {
    if (!blockPath) {
      continue;
    }

    const currentItem = createBacklinkBreadcrumbItem(blockPath);
    if (targetBlockIdSet.has(blockPath.id)) {
      return currentItem ? [currentItem] : [];
    }

    const childTrail = findBacklinkBreadcrumbTrail(
      blockPath.children || [],
      targetBlockIdSet,
    );
    if (childTrail) {
      return currentItem ? [currentItem, ...childTrail] : childTrail;
    }
  }

  return null;
}

function buildSingleBranchBreadcrumbTrail(blockPaths = []) {
  const breadcrumbItems = [];
  let currentLevel = blockPaths;

  while (Array.isArray(currentLevel) && currentLevel.length === 1) {
    const currentNode = currentLevel[0];
    const currentItem = createBacklinkBreadcrumbItem(currentNode);
    if (currentItem) {
      breadcrumbItems.push(currentItem);
    }
    currentLevel = currentNode?.children || [];
  }

  return breadcrumbItems;
}

function buildTopLevelBreadcrumbItems(blockPaths = []) {
  return (blockPaths || [])
    .map((blockPath) => createBacklinkBreadcrumbItem(blockPath))
    .filter(Boolean);
}

function buildFlatBacklinkBreadcrumbTrail(
  blockPaths = [],
  targetBlockIdSet = new Set(),
) {
  if (!Array.isArray(blockPaths) || blockPaths.length <= 0) {
    return null;
  }

  const targetIndex = blockPaths.findIndex((blockPath) =>
    targetBlockIdSet.has(blockPath?.id),
  );
  if (targetIndex < 0) {
    return null;
  }

  return blockPaths
    .slice(0, targetIndex + 1)
    .map((blockPath) => createBacklinkBreadcrumbItem(blockPath))
    .filter(Boolean);
}

function getBacklinkBreadcrumbTargetBlockIds(activeBacklink = null) {
  const targetBlockIdSet = new Set();
  const backlinkBlockId = String(activeBacklink?.backlinkBlock?.id || "").trim();
  if (backlinkBlockId) {
    targetBlockIdSet.add(backlinkBlockId);
  }
  return targetBlockIdSet;
}

function buildHeadingBreadcrumbItems(breadcrumbItems = []) {
  return (breadcrumbItems || []).filter((item) => item?.type === "h");
}

export function buildBacklinkBreadcrumbItems(activeBacklink = null) {
  const blockPaths = Array.isArray(activeBacklink?.blockPaths)
    ? activeBacklink.blockPaths
    : [];
  const targetBlockIdSet = getBacklinkBreadcrumbTargetBlockIds(activeBacklink);
  const matchedTrail = findBacklinkBreadcrumbTrail(blockPaths, targetBlockIdSet);
  if (Array.isArray(matchedTrail) && matchedTrail.length > 0) {
    const matchedHeadingTrail = buildHeadingBreadcrumbItems(matchedTrail);
    if (matchedHeadingTrail.length > 0) {
      return matchedHeadingTrail;
    }
  }

  const flatTrail = buildFlatBacklinkBreadcrumbTrail(blockPaths, targetBlockIdSet);
  if (Array.isArray(flatTrail) && flatTrail.length > 0) {
    const flatHeadingTrail = buildHeadingBreadcrumbItems(flatTrail);
    if (flatHeadingTrail.length > 0) {
      return flatHeadingTrail;
    }
  }

  const singleBranchTrail = buildSingleBranchBreadcrumbTrail(blockPaths);
  if (singleBranchTrail.length > 1) {
    return buildHeadingBreadcrumbItems(singleBranchTrail);
  }

  return buildHeadingBreadcrumbItems(buildTopLevelBreadcrumbItems(blockPaths));
}

function buildBacklinkBreadcrumbItemsHtml(breadcrumbItems = []) {
  return breadcrumbItems
    .map((item) => {
      const clickableClass = item.clickable
        ? " backlink-breadcrumb__item--clickable"
        : "";
      const nodeIdAttr =
        item.clickable && item.id ? ` data-node-id="${item.id}"` : "";
      return `<span class="protyle-breadcrumb__item backlink-breadcrumb__item${clickableClass}"${nodeIdAttr}>${item.label}</span>`;
    })
    .join("");
}

function buildBacklinkContextStateGroupHtml(contextVisibilityLevel = "core") {
  return BACKLINK_CONTEXT_LEVEL_ORDER.map((level) => {
    const isActive = level === contextVisibilityLevel;
    const activeClass = isActive ? " active" : "";
    return `<button type="button" class="backlink-chip backlink-chip--flat backlink-context-state${activeClass}" data-context-level="${level}" aria-pressed="${isActive}">${getBacklinkContextLevelLabel(level)}</button>`;
  }).join("");
}

function buildBacklinkContextControlRowHtml(contextControlState = {}) {
  const normalizedState = normalizeBacklinkContextControlState(
    contextControlState,
  );
  const previousDisabledAttr = normalizedState.previousDisabled ? " disabled" : "";
  const nextDisabledAttr = normalizedState.nextDisabled ? " disabled" : "";

  return `
<div class="backlink-context-control-row" data-context-level="${normalizedState.levelLabel}">
<button type="button" class="block__icon ariaLabel backlink-context-step-button previous" aria-label="切换到上一个上下文层级"${previousDisabledAttr}>
<svg><use xlink:href="#iconLeft"></use></svg>
</button>
<div class="backlink-context-state-group">${buildBacklinkContextStateGroupHtml(normalizedState.contextVisibilityLevel)}</div>
<button type="button" class="block__icon ariaLabel backlink-context-step-button next" aria-label="切换到下一个上下文层级"${nextDisabledAttr}>
<svg><use xlink:href="#iconRight"></use></svg>
</button>
<span class="b3-list-item__meta backlink-context-budget-hint">${normalizedState.budgetHint}</span>
</div>`;
}

export function buildBacklinkDocumentListItemHtml({
  documentName = "",
  docAriaText = "",
  progressText = "",
  breadcrumbItems = [],
  contextControlState = {},
} = {}) {
  const truncatedAriaText = docAriaText ? docAriaText.substring(0, 100) : "";

  return `
<div class="backlink-document-header-row">
<div class="backlink-document-title-row">
<span style="padding-left: 4px;margin-right: 2px" class="b3-list-item__toggle b3-list-item__toggle--hl">
<svg class="b3-list-item__arrow b3-list-item__arrow--open"><use xlink:href="#iconRight"></use></svg>
</span>
<svg class="b3-list-item__graphic popover__block"><use xlink:href="#iconFile"></use></svg>
<span class="b3-list-item__text ariaLabel"  aria-label="${truncatedAriaText}" title="${BACKLINK_DOCUMENT_TITLE_TOOLTIP}"  >
${documentName}
</span>
<span class="backlink-document-nav-group">
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button previous-backlink-icon" aria-label="上一个反链块"><use xlink:href="#iconLeft"></use></svg>
<span class="b3-list-item__meta backlink-nav-progress">${progressText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button next-backlink-icon" aria-label="下一个反链块"><use xlink:href="#iconRight"></use></svg>
</span>
</div>
${buildBacklinkContextControlRowHtml(contextControlState)}
<div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap backlink-breadcrumb-row">${buildBacklinkBreadcrumbItemsHtml(
    breadcrumbItems,
  )}</div>
</div>
`;
}

function updateBacklinkContextControlRow(
  documentLiElement,
  contextControlState = {},
) {
  const controlRowElement = documentLiElement.querySelector(
    ".backlink-context-control-row",
  );
  const previousButtonElement = documentLiElement.querySelector(
    ".backlink-context-step-button.previous",
  );
  const nextButtonElement = documentLiElement.querySelector(
    ".backlink-context-step-button.next",
  );
  const stateGroupElement = documentLiElement.querySelector(
    ".backlink-context-state-group",
  );
  const budgetHintElement = documentLiElement.querySelector(
    ".backlink-context-budget-hint",
  );
  const normalizedState = normalizeBacklinkContextControlState(
    contextControlState,
  );

  if (controlRowElement) {
    controlRowElement.setAttribute(
      "data-context-level",
      normalizedState.levelLabel,
    );
  }
  if (previousButtonElement) {
    previousButtonElement.setAttribute("aria-label", "切换到上一个上下文层级");
    if (normalizedState.previousDisabled) {
      previousButtonElement.setAttribute("disabled", true);
    } else {
      previousButtonElement.removeAttribute?.("disabled");
    }
  }
  if (nextButtonElement) {
    nextButtonElement.setAttribute("aria-label", "切换到下一个上下文层级");
    if (normalizedState.nextDisabled) {
      nextButtonElement.setAttribute("disabled", true);
    } else {
      nextButtonElement.removeAttribute?.("disabled");
    }
  }
  if (stateGroupElement) {
    stateGroupElement.innerHTML = buildBacklinkContextStateGroupHtml(
      normalizedState.contextVisibilityLevel,
    );
  }
  if (budgetHintElement) {
    budgetHintElement.textContent = normalizedState.budgetHint;
  }
}

export function updateBacklinkDocumentLiNavigation(
  documentLiElement,
  documentGroup,
  contextControlState = {},
) {
  if (!documentLiElement || !documentGroup || !documentGroup.activeBacklink) {
    return;
  }

  const progressElement = documentLiElement.querySelector(
    ".backlink-nav-progress",
  );
  const previousButton = documentLiElement.querySelector(
    ".previous-backlink-icon",
  );
  const nextButton = documentLiElement.querySelector(".next-backlink-icon");
  const textElement = documentLiElement.querySelector(".b3-list-item__text");
  const breadcrumbElement = documentLiElement.querySelector(".backlink-breadcrumb-row");
  const disableNavigation = documentGroup.backlinks.length <= 1;

  documentLiElement.setAttribute(
    "data-backlink-block-id",
    documentGroup.activeBacklink.backlinkBlock.id,
  );
  if (progressElement) {
    progressElement.textContent = documentGroup.progressText;
  }
  if (textElement) {
    textElement.setAttribute(
      "aria-label",
      documentGroup.activeBacklink.backlinkBlock.content.substring(0, 100),
    );
    textElement.setAttribute("title", BACKLINK_DOCUMENT_TITLE_TOOLTIP);
  }
  if (breadcrumbElement) {
    breadcrumbElement.innerHTML = buildBacklinkBreadcrumbItemsHtml(
      buildBacklinkBreadcrumbItems(documentGroup.activeBacklink),
    );
  }
  updateBacklinkContextControlRow(documentLiElement, contextControlState);
  previousButton?.classList.toggle("disabled", disableNavigation);
  nextButton?.classList.toggle("disabled", disableNavigation);
}

export function createBacklinkDocumentListItemElement({
  documentGroup,
  contextControlState = {},
  parentElement,
  documentRef = globalThis.document,
  onDocumentClick,
  onMouseDown,
  onContextMenu,
  onToggle,
  onNavigate,
  onStepContextLevel,
  onBreadcrumbNavigate,
} = {}) {
  if (!documentGroup || !documentRef?.createElement) {
    return null;
  }

  const activeBacklink = documentGroup.activeBacklink;
  const documentLiElement = documentRef.createElement("li");
  documentLiElement.classList.add(
    "b3-list-item",
    "b3-list-item--hide-action",
    "list-item__document-name",
  );
  documentLiElement.setAttribute("data-node-id", documentGroup.documentId);
  documentLiElement.setAttribute(
    "data-backlink-block-id",
    activeBacklink?.backlinkBlock?.id || "",
  );
  documentLiElement.innerHTML = buildBacklinkDocumentListItemHtml({
    documentName: documentGroup.documentName,
    docAriaText: activeBacklink?.backlinkBlock?.content,
    progressText: documentGroup.progressText,
    contextControlState,
    breadcrumbItems: buildBacklinkBreadcrumbItems(activeBacklink),
  });

  documentLiElement.addEventListener("mousedown", (event) => {
    onMouseDown?.(event);
  });
  documentLiElement.addEventListener("click", (event) => {
    onDocumentClick?.(event);
  });
  documentLiElement.addEventListener("contextmenu", (event) => {
    onContextMenu?.(event);
  });

  documentLiElement
    .querySelector(".b3-list-item__toggle")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggle?.(documentLiElement);
    });

  documentLiElement.addEventListener("mousedown", (event) => {
    if (event.button !== 1) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    onToggle?.(event.currentTarget);
  });

  documentLiElement
    .querySelector(".backlink-context-step-button.previous")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onStepContextLevel?.(documentLiElement, "previous");
    });

  documentLiElement
    .querySelector(".backlink-context-step-button.next")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onStepContextLevel?.(documentLiElement, "next");
    });

  documentLiElement
    .querySelector(".backlink-context-state-group")
    ?.addEventListener("click", (event) => {
      const contextLevel = getBacklinkContextStateLevelFromTarget(event.target);
      if (!contextLevel) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onStepContextLevel?.(documentLiElement, contextLevel);
    });

  documentLiElement
    .querySelector(".backlink-breadcrumb-row")
    ?.addEventListener("click", (event) => {
      const breadcrumbItem = event.target?.closest?.(".backlink-breadcrumb__item");
      const blockId = breadcrumbItem?.getAttribute?.("data-node-id") || "";
      if (!blockId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onBreadcrumbNavigate?.(documentLiElement, blockId);
    });

  documentLiElement
    .querySelector(".previous-backlink-icon")
    ?.addEventListener("click", (event) => {
      onNavigate?.(event, "previous");
      event.stopPropagation();
    });

  documentLiElement
    .querySelector(".next-backlink-icon")
    ?.addEventListener("click", (event) => {
      onNavigate?.(event, "next");
      event.stopPropagation();
    });

  parentElement?.append?.(documentLiElement);
  return documentLiElement;
}
