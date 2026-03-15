import { getBacklinkContextSourceRule } from "../../service/backlink/backlink-context-rules.js";

const BACKLINK_CONTEXT_LEVEL_ORDER = ["core", "nearby", "extended", "full"];
const BACKLINK_CONTEXT_LEVEL_LABELS = {
  core: "核心",
  nearby: "近邻",
  extended: "扩展",
  full: "全文",
};
const BACKLINK_DOCUMENT_TITLE_TOOLTIP =
  "单击逐级展开上下文，Ctrl+单击打开反链块";

export function getBacklinkContextLevelLabel(level = "core") {
  return BACKLINK_CONTEXT_LEVEL_LABELS[level] || BACKLINK_CONTEXT_LEVEL_LABELS.core;
}

function getBacklinkMatchMeta(backlinkData = null) {
  const primaryMatchSourceType =
    backlinkData?.contextBundle?.primaryMatchSourceType || "";
  const matchSourceLabel = primaryMatchSourceType
    ? getBacklinkContextSourceRule(primaryMatchSourceType).label
    : "";
  const matchSummaryText =
    backlinkData?.contextBundle?.matchSummaryList?.[0] || "";
  return {
    matchSourceLabel,
    matchSummaryText,
  };
}

function normalizeBacklinkContextControlState(contextControlState = {}) {
  const contextVisibilityLevel =
    contextControlState.contextVisibilityLevel || "core";
  return {
    contextVisibilityLevel,
    levelLabel: getBacklinkContextLevelLabel(contextVisibilityLevel),
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

  return `
<div class="backlink-context-control-row" data-context-level="${normalizedState.levelLabel}">
<button type="button" class="block__icon ariaLabel backlink-context-step-button previous" aria-label="切换到上一个上下文层级">
<svg><use xlink:href="#iconLeft"></use></svg>
</button>
<div class="backlink-context-state-group">${buildBacklinkContextStateGroupHtml(normalizedState.contextVisibilityLevel)}</div>
<button type="button" class="block__icon ariaLabel backlink-context-step-button next" aria-label="切换到下一个上下文层级">
<svg><use xlink:href="#iconRight"></use></svg>
</button>
</div>`;
}

export function buildBacklinkDocumentListItemHtml({
  documentName = "",
  docAriaText = "",
  progressText = "",
  matchSourceLabel = "",
  matchSummaryText = "",
  contextControlState = {},
} = {}) {
  const truncatedAriaText = docAriaText ? docAriaText.substring(0, 100) : "";

  return `
<div class="backlink-document-header-row">
<span style="padding-left: 4px;margin-right: 2px" class="b3-list-item__toggle b3-list-item__toggle--hl">
<svg class="b3-list-item__arrow b3-list-item__arrow--open"><use xlink:href="#iconRight"></use></svg>
</span>
<svg class="b3-list-item__graphic popover__block"><use xlink:href="#iconFile"></use></svg>
<span class="b3-list-item__text ariaLabel"  aria-label="${truncatedAriaText}" title="${BACKLINK_DOCUMENT_TITLE_TOOLTIP}"  >
${documentName}
</span>
<span class="b3-list-item__meta backlink-chip backlink-chip--flat backlink-context-source">${matchSourceLabel}</span>
<span class="b3-list-item__meta backlink-context-summary">${matchSummaryText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button previous-backlink-icon" aria-label="上一个反链块"><use xlink:href="#iconLeft"></use></svg>
<span class="b3-list-item__meta backlink-nav-progress">${progressText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button next-backlink-icon" aria-label="下一个反链块"><use xlink:href="#iconRight"></use></svg>
</div>
${buildBacklinkContextControlRowHtml(contextControlState)}
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
  }
  if (nextButtonElement) {
    nextButtonElement.setAttribute("aria-label", "切换到下一个上下文层级");
  }
  if (stateGroupElement) {
    stateGroupElement.innerHTML = buildBacklinkContextStateGroupHtml(
      normalizedState.contextVisibilityLevel,
    );
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
  const sourceElement = documentLiElement.querySelector(".backlink-context-source");
  const summaryElement = documentLiElement.querySelector(".backlink-context-summary");
  const disableNavigation = documentGroup.backlinks.length <= 1;
  const { matchSourceLabel, matchSummaryText } = getBacklinkMatchMeta(
    documentGroup.activeBacklink,
  );

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
  if (sourceElement) {
    sourceElement.textContent = matchSourceLabel;
  }
  if (summaryElement) {
    summaryElement.textContent = matchSummaryText;
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
  onContextMenu,
  onToggle,
  onNavigate,
  onStepContextLevel,
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
    ...getBacklinkMatchMeta(activeBacklink),
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
