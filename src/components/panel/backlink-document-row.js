import {
  BACKLINK_CONTEXT_LEVEL_ORDER,
  getBacklinkContextLevelLabel,
  getBacklinkContextLevelTooltip,
} from "./backlink-panel-header.js";
import { renderIcon } from "../../utils/svg-icon.ts";
import { buildBacklinkProgressTooltip } from "../../utils/tooltip.ts";
import { getBlockTypeIconHref } from "../../utils/icon-util.ts";
// 单行短文案（≤12 字），详细交互说明不再塞入 tooltip
const BACKLINK_DOCUMENT_TITLE_TOOLTIP = "左键打开，右键右侧打开";
// 面包屑最大可见层级数：超过时折叠为「首级 › … › 末级」
const BACKLINK_BREADCRUMB_MAX_VISIBLE = 3;

export function buildBacklinkTargetBlockItemHtml(targetBlock = {}) {
  const blockId = String(targetBlock?.id || "").trim();
  const rootId = String(targetBlock?.rootId || targetBlock?.root_id || "").trim();
  const blockType = String(targetBlock?.type || "p").trim();
  const blockSubType = String(targetBlock?.subType || targetBlock?.subtype || "").trim();
  const rawContent = String(targetBlock?.content || "").trim();
  const isDocument = blockType === "d";
  const displayContent = rawContent || (isDocument ? "文档标题" : "被引用的块");
  const iconHref = getBlockTypeIconHref?.(blockType, blockSubType) || "#iconFile";
  const tooltipText = `${displayContent}（点击跳转定位）`;

  return `<div class="backlink-target-card b3-tooltips b3-tooltips__s" data-target-block-id="${blockId}" data-target-root-id="${rootId}" data-target-type="${blockType}" aria-label="${tooltipText}" title="${tooltipText}"><svg class="b3-list-item__graphic backlink-target-card__icon" style="fill:none!important;"><use xlink:href="${iconHref}"></use></svg><span class="backlink-target-card__text">${displayContent}</span></div>`;
}

export function buildBacklinkTargetSectionHtml(
  targetBlocks = [],
  showReferencedTargetBlock = true,
) {
  if (!showReferencedTargetBlock) {
    return "";
  }

  const items =
    Array.isArray(targetBlocks) && targetBlocks.length > 0
      ? targetBlocks
      : [{ id: "", type: "d", subType: "", content: "文档标题" }];

  const itemsHtml = items
    .map((block) => buildBacklinkTargetBlockItemHtml(block))
    .join("");

  return `<div class="backlink-target-section"><div class="backlink-target-connector"><svg class="bl-icon backlink-target-arrow" width="14" height="14" style="fill:none!important;" aria-hidden="true"><use xlink:href="#iconBlChevronDown"></use></svg></div><div class="backlink-target-card-group">${itemsHtml}</div></div>`;
}

export function updateBacklinkTargetSection(
  documentLiElement,
  targetBlocks = [],
  showReferencedTargetBlock = true,
  onTargetBlockClick = null,
) {
  if (!documentLiElement) {
    return;
  }

  const targetSectionContainer =
    documentLiElement.nextElementSibling?.querySelector?.(
      ".backlink-target-section-container",
    ) ||
    documentLiElement.querySelector?.(".backlink-target-section-container");

  if (!targetSectionContainer) {
    return;
  }

  targetSectionContainer.innerHTML = buildBacklinkTargetSectionHtml(
    targetBlocks,
    showReferencedTargetBlock,
  );

  const clickHandler = onTargetBlockClick || documentLiElement._onTargetBlockClick;
  if (clickHandler) {
    const targetCards = targetSectionContainer.querySelectorAll?.(
      ".backlink-target-card",
    );
    if (targetCards) {
      for (const card of targetCards) {
        const blockId = card.getAttribute?.("data-target-block-id") || "";
        const rootId = card.getAttribute?.("data-target-root-id") || "";
        const blockType = card.getAttribute?.("data-target-type") || "";

        card.addEventListener?.("click", (event) => {
          clickHandler(event, blockId, rootId, blockType);
        });

        card.addEventListener?.("contextmenu", (event) => {
          clickHandler(event, blockId, rootId, blockType);
        });
      }
    }
  }
}

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

/**
 * 面包屑层级折叠：超过 maxVisible 级时折叠为「首级 › … › 末级」，
 * 中间折叠部分渲染为不可点击的省略项
 */
export function collapseBacklinkBreadcrumbItems(
  breadcrumbItems = [],
  maxVisible = BACKLINK_BREADCRUMB_MAX_VISIBLE,
) {
  if (!Array.isArray(breadcrumbItems) || breadcrumbItems.length <= maxVisible) {
    return Array.isArray(breadcrumbItems) ? breadcrumbItems : [];
  }
  return [
    breadcrumbItems[0],
    { id: "", label: "…", clickable: false, ellipsis: true },
    breadcrumbItems[breadcrumbItems.length - 1],
  ];
}

/** 拼接面包屑完整路径文本，用于悬停 tooltip */
export function buildBacklinkBreadcrumbFullPath(breadcrumbItems = []) {
  return (breadcrumbItems || [])
    .map((item) => item?.label || "")
    .filter(Boolean)
    .join(" › ");
}

function buildBacklinkBreadcrumbItemsHtml(breadcrumbItems = []) {
  const fullPath = buildBacklinkBreadcrumbFullPath(breadcrumbItems);
  const visibleItems = collapseBacklinkBreadcrumbItems(breadcrumbItems);
  const count = visibleItems.length;
  return visibleItems
    .map((item, index) => {
      const isLast = index === count - 1;
      const ellipsisClass = item.ellipsis
        ? " backlink-breadcrumb__item--ellipsis"
        : "";
      const clickableClass =
        item.clickable && !item.ellipsis
          ? " backlink-breadcrumb__item--clickable"
          : "";
      const currentClass = isLast
        ? " backlink-breadcrumb__item--current"
        : "";
      const nodeIdAttr =
        item.clickable && item.id ? ` data-node-id="${item.id}"` : "";
      // 末级悬停展示完整路径，弥补折叠后中间层级的信息缺失
      const ariaAttr =
        isLast && fullPath ? ` aria-label="${fullPath}" title="${fullPath}"` : "";
      return `<span class="protyle-breadcrumb__item backlink-breadcrumb__item${ellipsisClass}${clickableClass}${currentClass}"${nodeIdAttr}${ariaAttr}>${item.label}</span>`;
    })
    .join("");
}

function buildBacklinkContextStateGroupHtml(contextVisibilityLevel = "core") {
  return BACKLINK_CONTEXT_LEVEL_ORDER.map((level) => {
    const isActive = level === contextVisibilityLevel;
    const activeClass = isActive ? " active" : "";
    const tooltip = getBacklinkContextLevelTooltip(level);
    return `<button type="button" class="backlink-chip backlink-chip--flat backlink-context-state${activeClass} ariaLabel" data-context-level="${level}" aria-pressed="${isActive}" aria-label="${tooltip}">${getBacklinkContextLevelLabel(level)}</button>`;
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
${renderIcon("iconBlChevronLeft")}
</button>
<div class="backlink-context-state-group">${buildBacklinkContextStateGroupHtml(normalizedState.contextVisibilityLevel)}</div>
<button type="button" class="block__icon ariaLabel backlink-context-step-button next" aria-label="切换到下一个上下文层级"${nextDisabledAttr}>
${renderIcon("iconBlChevronRight")}
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
  const progressTooltip = buildBacklinkProgressTooltip(progressText);
  const progressAriaAttr = progressTooltip
    ? ` aria-label="${progressTooltip}" title="${progressTooltip}"`
    : "";

  return `
<div class="backlink-document-header-row">
<div class="backlink-document-title-row">
<span style="padding-left: 4px;margin-right: 2px" class="b3-list-item__toggle b3-list-item__toggle--hl" aria-label="展开/折叠文档">
<svg class="b3-list-item__arrow b3-list-item__arrow--open" style="fill:none!important;"><use xlink:href="#iconBlChevronRight"></use></svg>
</span>
<svg class="b3-list-item__graphic popover__block" style="fill:none!important;"><use xlink:href="#iconFile"></use></svg>
<span class="b3-list-item__text ariaLabel"  aria-label="${truncatedAriaText}" title="${BACKLINK_DOCUMENT_TITLE_TOOLTIP}"  >
${documentName}
</span>
<span class="backlink-document-nav-group">
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button previous-backlink-icon" style="fill:none!important;" aria-label="上一个反链块"><use xlink:href="#iconBlChevronLeft"></use></svg>
<span class="b3-list-item__meta b3-tooltips b3-tooltips__s backlink-nav-progress"${progressAriaAttr}>${progressText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button next-backlink-icon" style="fill:none!important;" aria-label="下一个反链块"><use xlink:href="#iconBlChevronRight"></use></svg>
</span>
</div>
${buildBacklinkContextControlRowHtml(contextControlState)}
<div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap backlink-breadcrumb-row" title="${buildBacklinkBreadcrumbFullPath(
    breadcrumbItems,
  )}">${buildBacklinkBreadcrumbItemsHtml(
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
  options = {},
) {
  if (!documentLiElement || !documentGroup || !documentGroup.activeBacklink) {
    return;
  }

  const showReferencedTargetBlock =
    options?.showReferencedTargetBlock ??
    documentLiElement._showReferencedTargetBlock ??
    true;
  const onTargetBlockClick =
    options?.onTargetBlockClick ?? documentLiElement._onTargetBlockClick;

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
    // 同步补齐进度 tooltip（如 "第 1 条 / 共 3 条反链"）
    const progressTooltip = buildBacklinkProgressTooltip(
      documentGroup.progressText,
    );
    if (progressTooltip) {
      progressElement.setAttribute?.("aria-label", progressTooltip);
      progressElement.setAttribute?.("title", progressTooltip);
    }
  }
  if (textElement) {
    textElement.setAttribute(
      "aria-label",
      documentGroup.activeBacklink.backlinkBlock.content.substring(0, 100),
    );
    textElement.setAttribute("title", BACKLINK_DOCUMENT_TITLE_TOOLTIP);
  }
  if (breadcrumbElement) {
    const breadcrumbItems = buildBacklinkBreadcrumbItems(
      documentGroup.activeBacklink,
    );
    breadcrumbElement.innerHTML = buildBacklinkBreadcrumbItemsHtml(breadcrumbItems);
    // 悬停展示完整路径
    breadcrumbElement.setAttribute?.(
      "title",
      buildBacklinkBreadcrumbFullPath(breadcrumbItems),
    );
  }
  updateBacklinkContextControlRow(documentLiElement, contextControlState);
  updateBacklinkTargetSection(
    documentLiElement,
    documentGroup.activeBacklink?.targetBlocks,
    showReferencedTargetBlock,
    onTargetBlockClick,
  );
  previousButton?.classList.toggle("disabled", disableNavigation);
  nextButton?.classList.toggle("disabled", disableNavigation);
}

export function createBacklinkDocumentListItemElement({
  documentGroup,
  contextControlState = {},
  showReferencedTargetBlock = true,
  parentElement,
  documentRef = globalThis.document,
  onDocumentClick,
  onMouseDown,
  onContextMenu,
  onToggle,
  onNavigate,
  onStepContextLevel,
  onBreadcrumbNavigate,
  onTargetBlockClick,
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
  documentLiElement._showReferencedTargetBlock = showReferencedTargetBlock;
  documentLiElement._onTargetBlockClick = onTargetBlockClick;
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
      documentLiElement
        .querySelectorAll?.(".backlink-breadcrumb__item")
        ?.forEach?.((el) =>
          el.classList?.remove?.(
            "backlink-breadcrumb__item--selected",
            "backlink-breadcrumb__item--current",
            "active",
          ),
        );
      breadcrumbItem.classList?.add?.(
        "backlink-breadcrumb__item--selected",
        "active",
      );
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
