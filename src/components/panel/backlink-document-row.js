import { getBacklinkContextSourceRule } from "../../service/backlink/backlink-context-rules.js";

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

export function buildBacklinkDocumentListItemHtml({
  documentName = "",
  docAriaText = "",
  progressText = "",
  matchSourceLabel = "",
  matchSummaryText = "",
} = {}) {
  const truncatedAriaText = docAriaText ? docAriaText.substring(0, 100) : "";

  return `
<span style="padding-left: 4px;margin-right: 2px" class="b3-list-item__toggle b3-list-item__toggle--hl">
<svg class="b3-list-item__arrow b3-list-item__arrow--open"><use xlink:href="#iconRight"></use></svg>
</span>
<svg class="b3-list-item__graphic popover__block"><use xlink:href="#iconFile"></use></svg>
<span class="b3-list-item__text ariaLabel"  aria-label="${truncatedAriaText}"  >
${documentName}
</span>
<span class="b3-list-item__meta backlink-context-source">${matchSourceLabel}</span>
<span class="b3-list-item__meta backlink-context-summary">${matchSummaryText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button previous-backlink-icon" aria-label="上一个反链块"><use xlink:href="#iconLeft"></use></svg>
<span class="b3-list-item__meta backlink-nav-progress">${progressText}</span>
<svg class="b3-list-item__graphic counter ariaLabel backlink-nav-button next-backlink-icon" aria-label="下一个反链块"><use xlink:href="#iconRight"></use></svg>
`;
}

export function updateBacklinkDocumentLiNavigation(
  documentLiElement,
  documentGroup,
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
  }
  if (sourceElement) {
    sourceElement.textContent = matchSourceLabel;
  }
  if (summaryElement) {
    summaryElement.textContent = matchSummaryText;
  }
  previousButton?.classList.toggle("disabled", disableNavigation);
  nextButton?.classList.toggle("disabled", disableNavigation);
}

export function createBacklinkDocumentListItemElement({
  documentGroup,
  parentElement,
  documentRef = globalThis.document,
  onDocumentClick,
  onContextMenu,
  onToggle,
  onNavigate,
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
