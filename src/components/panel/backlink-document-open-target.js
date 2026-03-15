export function getBacklinkDocumentOpenTarget(openArea = "focus") {
  if (openArea === "focus") {
    return {
      shouldActivateMainArea: false,
    };
  }

  return {
    position: openArea === "right" ? "right" : undefined,
    shouldActivateMainArea: openArea === "main",
  };
}

export function mergeBacklinkDocumentOpenTargetIntoTabOptions(
  options = {},
  openTarget = {},
) {
  if (!openTarget || !openTarget.position) {
    return { ...options };
  }

  return {
    ...options,
    position: openTarget.position,
  };
}

export function getBacklinkDocumentPreClickOpenArea({
  currentTab = null,
  documentRef = globalThis.document,
} = {}) {
  const currentWndElement = currentTab?.parent?.element;
  if (
    !currentWndElement ||
    !documentRef ||
    typeof documentRef.querySelector !== "function"
  ) {
    return "focus";
  }

  const activeWndElement = documentRef.querySelector("div.layout__wnd--active");
  if (!activeWndElement) {
    return "focus";
  }

  return activeWndElement === currentWndElement ? "right" : "main";
}

function getBacklinkDocumentWndElementDebugInfo(element) {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect?.();
  return {
    id: element.id || null,
    dataId:
      typeof element.getAttribute === "function"
        ? element.getAttribute("data-id")
        : null,
    className: element.className || "",
    left: typeof rect?.left === "number" ? rect.left : null,
    width: typeof rect?.width === "number" ? rect.width : null,
  };
}

export function getBacklinkDocumentOpenDebugSnapshot({
  currentTab = null,
  documentRef = globalThis.document,
} = {}) {
  const currentWndElement = currentTab?.parent?.element || null;
  const activeWndElement =
    documentRef?.querySelector?.("div.layout__wnd--active") || null;

  return {
    currentWnd: getBacklinkDocumentWndElementDebugInfo(currentWndElement),
    activeWnd: getBacklinkDocumentWndElementDebugInfo(activeWndElement),
    inferredPreClickOpenArea: getBacklinkDocumentPreClickOpenArea({
      currentTab,
      documentRef,
    }),
  };
}

export function resolveBacklinkDocumentOpenArea(
  requestedOpenArea = "focus",
  preClickOpenArea = "focus",
) {
  if (requestedOpenArea !== "focus") {
    return requestedOpenArea;
  }

  return preClickOpenArea || "focus";
}

function collectWndArray(layoutNode, result = []) {
  if (!layoutNode) {
    return result;
  }

  if (layoutNode.headersElement) {
    result.push(layoutNode);
    return result;
  }

  if (Array.isArray(layoutNode.children)) {
    for (const child of layoutNode.children) {
      collectWndArray(child, result);
    }
    return result;
  }

  return result;
}

function getWndLeftOffset(wnd) {
  const left = wnd?.element?.getBoundingClientRect?.().left;
  return typeof left === "number" ? left : Number.POSITIVE_INFINITY;
}

export function getBacklinkDocumentMainAreaWnd({
  currentTab = null,
  windowRef = globalThis.window,
} = {}) {
  const centerLayout = windowRef?.siyuan?.layout?.centerLayout;
  const wndArray = collectWndArray(centerLayout).filter((wnd) => wnd);
  if (wndArray.length <= 0) {
    return null;
  }

  const currentWnd = currentTab?.parent || null;
  const candidateWndArray = wndArray.filter((wnd) => wnd !== currentWnd);
  const targetWndArray =
    candidateWndArray.length > 0 ? candidateWndArray : wndArray;

  targetWndArray.sort((a, b) => getWndLeftOffset(a) - getWndLeftOffset(b));
  return targetWndArray[0] || null;
}

export function getActiveBacklinkDocumentMainAreaTabElement({
  currentTab = null,
  windowRef = globalThis.window,
} = {}) {
  const mainAreaWnd = getBacklinkDocumentMainAreaWnd({
    currentTab,
    windowRef,
  });
  if (!mainAreaWnd) {
    return null;
  }

  return (
    mainAreaWnd.headersElement?.querySelector?.("li.item--focus") ||
    mainAreaWnd.children?.[0]?.headElement ||
    null
  );
}

export function activateBacklinkDocumentMainArea({
  currentTab = null,
  windowRef = globalThis.window,
} = {}) {
  const activeMainAreaTabElement = getActiveBacklinkDocumentMainAreaTabElement({
    currentTab,
    windowRef,
  });
  if (!activeMainAreaTabElement) {
    return false;
  }

  if (typeof activeMainAreaTabElement.click === "function") {
    activeMainAreaTabElement.click();
    return true;
  }

  return false;
}
