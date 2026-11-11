import {
  BACKLINK_CONTEXT_LEVEL_ORDER,
  getBacklinkContextLevelLabel,
  getBacklinkContextLevelTooltip,
} from "./backlink-panel-header.js";
import { renderIcon } from "../../utils/svg-icon.ts";
import { buildBacklinkProgressTooltip } from "../../utils/tooltip.ts";
import { getBlockTypeIconHref } from "../../utils/icon-util.ts";
import {
  buildBacklinkBreadcrumbFullPath,
  buildBacklinkBreadcrumbItems,
  buildBacklinkBreadcrumbItemsHtml,
} from "./backlink-breadcrumb.js";
// 单行短文案（≤12 字），详细交互说明不再塞入 tooltip；文案经 i18n 参数传入，缺省中文回退
const BACKLINK_DOCUMENT_TITLE_TOOLTIP_FALLBACK = "左键打开，右键右侧打开";

export function buildBacklinkTargetBlockItemHtml(targetBlock = {}, i18n = {}) {
  const blockId = String(targetBlock?.id || "").trim();
  const rootId = String(targetBlock?.rootId || targetBlock?.root_id || "").trim();
  const blockType = String(targetBlock?.type || "p").trim();
  const blockSubType = String(targetBlock?.subType || targetBlock?.subtype || "").trim();
  const rawContent = String(targetBlock?.content || "").trim();
  const isDocument = blockType === "d";
  const displayContent =
    rawContent ||
    (isDocument ? i18n?.docTitleFallback || "文档标题" : i18n?.refBlockFallback || "被引用的块");
  const iconHref = getBlockTypeIconHref?.(blockType, blockSubType) || "#iconFile";
  const tooltipText = `${displayContent}${i18n?.clickToLocate || "（点击跳转定位）"}`;

  return `<div class="backlink-target-card b3-tooltips b3-tooltips__s" data-target-block-id="${blockId}" data-target-root-id="${rootId}" data-target-type="${blockType}" aria-label="${tooltipText}" title="${tooltipText}"><svg class="b3-list-item__graphic backlink-target-card__icon" style="fill:none!important;"><use xlink:href="${iconHref}"></use></svg><span class="backlink-target-card__text">${displayContent}</span></div>`;
}

export function buildBacklinkTargetSectionHtml(
  targetBlocks = [],
  showReferencedTargetBlock = false,
  i18n = {},
) {
  if (!showReferencedTargetBlock) {
    return "";
  }

  const items =
    Array.isArray(targetBlocks) && targetBlocks.length > 0
      ? targetBlocks
      : [{ id: "", type: "d", subType: "", content: i18n?.docTitleFallback || "文档标题" }];

  const itemsHtml = items
    .map((block) => buildBacklinkTargetBlockItemHtml(block, i18n))
    .join("");

  return `<div class="backlink-target-section"><div class="backlink-target-connector"><svg class="bl-icon backlink-target-arrow" width="14" height="14" style="fill:none!important;" aria-hidden="true"><use xlink:href="#iconBlChevronDown"></use></svg></div><div class="backlink-target-card-group">${itemsHtml}</div></div>`;
}

export function updateBacklinkTargetSection(
  documentLiElement,
  targetBlocks = [],
  showReferencedTargetBlock = false,
  onTargetBlockClick = null,
  i18n = {},
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
    i18n,
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

function normalizeBacklinkContextControlState(contextControlState = {}, i18n = {}) {
  const contextVisibilityLevel =
    contextControlState.contextVisibilityLevel || "core";
  return {
    contextVisibilityLevel,
    levelLabel: getBacklinkContextLevelLabel(contextVisibilityLevel, i18n),
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


function buildBacklinkContextStateGroupHtml(contextVisibilityLevel = "core", i18n = {}) {
  return BACKLINK_CONTEXT_LEVEL_ORDER.map((level) => {
    const isActive = level === contextVisibilityLevel;
    const activeClass = isActive ? " active" : "";
    const tooltip = getBacklinkContextLevelTooltip(level, i18n);
    return `<button type="button" class="backlink-chip backlink-chip--flat backlink-context-state${activeClass} ariaLabel" data-context-level="${level}" aria-pressed="${isActive}" aria-label="${tooltip}">${getBacklinkContextLevelLabel(level, i18n)}</button>`;
  }).join("");
}

function buildBacklinkContextControlRowHtml(contextControlState = {}, i18n = {}) {
  const normalizedState = normalizeBacklinkContextControlState(
    contextControlState,
    i18n,
  );
  const previousDisabledAttr = normalizedState.previousDisabled ? " disabled" : "";
  const nextDisabledAttr = normalizedState.nextDisabled ? " disabled" : "";

  return `
<div class="backlink-context-control-row" data-context-level="${normalizedState.levelLabel}">
<button type="button" class="block__icon ariaLabel backlink-context-step-button previous" aria-label="${i18n?.stepPrevLevelAria || "切换到上一个上下文层级"}"${previousDisabledAttr}>
${renderIcon("iconBlChevronLeft")}
</button>
<div class="backlink-context-state-group">${buildBacklinkContextStateGroupHtml(normalizedState.contextVisibilityLevel, i18n)}</div>
<button type="button" class="block__icon ariaLabel backlink-context-step-button next" aria-label="${i18n?.stepNextLevelAria || "切换到下一个上下文层级"}"${nextDisabledAttr}>
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
  i18n = {},
} = {}) {
  const truncatedAriaText = docAriaText ? docAriaText.substring(0, 100) : "";
  const progressTooltip = buildBacklinkProgressTooltip(progressText);
  const progressAriaAttr = progressTooltip
    ? ` aria-label="${progressTooltip}" title="${progressTooltip}"`
    : "";

  return `
<div class="backlink-document-header-row">
<div class="backlink-document-title-row">
<span style="padding-left: 4px;margin-right: 2px" class="b3-list-item__toggle b3-list-item__toggle--hl" aria-label="${i18n?.toggleDocAria || "展开/折叠文档"}">
<svg class="b3-list-item__arrow b3-list-item__arrow--open" style="fill:none!important;"><use xlink:href="#iconBlChevronRight"></use></svg>
</span>
<svg class="b3-list-item__graphic popover__block" style="fill:none!important;"><use xlink:href="#iconFile"></use></svg>
<span class="b3-list-item__text ariaLabel"  aria-label="${truncatedAriaText}" title="${i18n?.docTitleTooltip || BACKLINK_DOCUMENT_TITLE_TOOLTIP_FALLBACK}"  >
${documentName}
</span>
<span class="backlink-document-nav-group">
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button previous-backlink-icon" style="fill:none!important;" aria-label="${i18n?.prevBacklinkAria || "上一个反链块"}"><use xlink:href="#iconBlChevronLeft"></use></svg>
<span class="b3-list-item__meta b3-tooltips b3-tooltips__s backlink-nav-progress"${progressAriaAttr}>${progressText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button next-backlink-icon" style="fill:none!important;" aria-label="${i18n?.nextBacklinkAria || "下一个反链块"}"><use xlink:href="#iconBlChevronRight"></use></svg>
</span>
</div>
${buildBacklinkContextControlRowHtml(contextControlState, i18n)}
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
  i18n = {},
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
    i18n,
  );

  if (controlRowElement) {
    controlRowElement.setAttribute(
      "data-context-level",
      normalizedState.levelLabel,
    );
  }
  if (previousButtonElement) {
    previousButtonElement.setAttribute(
      "aria-label",
      i18n?.stepPrevLevelAria || "切换到上一个上下文层级",
    );
    if (normalizedState.previousDisabled) {
      previousButtonElement.setAttribute("disabled", true);
    } else {
      previousButtonElement.removeAttribute?.("disabled");
    }
  }
  if (nextButtonElement) {
    nextButtonElement.setAttribute(
      "aria-label",
      i18n?.stepNextLevelAria || "切换到下一个上下文层级",
    );
    if (normalizedState.nextDisabled) {
      nextButtonElement.setAttribute("disabled", true);
    } else {
      nextButtonElement.removeAttribute?.("disabled");
    }
  }
  if (stateGroupElement) {
    stateGroupElement.innerHTML = buildBacklinkContextStateGroupHtml(
      normalizedState.contextVisibilityLevel,
      i18n,
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
    false;
  const onTargetBlockClick =
    options?.onTargetBlockClick ?? documentLiElement._onTargetBlockClick;
  const i18n = options?.i18n || {};

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
    textElement.setAttribute(
      "title",
      i18n?.docTitleTooltip || BACKLINK_DOCUMENT_TITLE_TOOLTIP_FALLBACK,
    );
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
  updateBacklinkContextControlRow(documentLiElement, contextControlState, i18n);
  updateBacklinkTargetSection(
    documentLiElement,
    documentGroup.activeBacklink?.targetBlocks,
    showReferencedTargetBlock,
    onTargetBlockClick,
    i18n,
  );
  previousButton?.classList.toggle("disabled", disableNavigation);
  nextButton?.classList.toggle("disabled", disableNavigation);
}

export function createBacklinkDocumentListItemElement({
  documentGroup,
  i18n = {},
  contextControlState = {},
  showReferencedTargetBlock = false,
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
  const documentLiElement = documentRef.createElement("div");
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
    i18n,
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
