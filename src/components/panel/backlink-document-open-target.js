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

function getBacklinkDocumentCurrentWnd(currentTab = null) {
  return currentTab?.tab?.parent || currentTab?.parent || null;
}

function getBacklinkDocumentCurrentTabHeadElement(currentTab = null) {
  return currentTab?.tab?.headElement || null;
}

function getBacklinkDocumentFocusedWndElement(
  documentRef = globalThis.document,
) {
  const activeElement = documentRef?.activeElement;
  const activeElementWnd = getBacklinkDocumentWndElementFromTarget(
    activeElement,
  );
  if (activeElementWnd) {
    return activeElementWnd;
  }

  const activeTabWnd = getBacklinkDocumentWndElementFromTarget(
    documentRef?.querySelector?.("div.layout__wnd--active ul.layout-tab-bar>li.item--focus") ||
      documentRef?.querySelector?.("li.item--focus") ||
      null,
  );
  if (activeTabWnd) {
    return activeTabWnd;
  }

  return documentRef?.querySelector?.("div.layout__wnd--active") || null;
}

function getBacklinkDocumentClosestWndElement(target) {
  let currentTarget = target || null;
  while (currentTarget) {
    if (typeof currentTarget.closest === "function") {
      const wndElement = currentTarget.closest(".layout__wnd");
      if (wndElement) {
        return wndElement;
      }
    }

    currentTarget =
      currentTarget.parentElement ||
      currentTarget.parentNode ||
      currentTarget.host ||
      currentTarget.getRootNode?.()?.host ||
      null;
  }

  return null;
}

export function getBacklinkDocumentWndElementFromTarget(target, event = null) {
  const eventPath = event?.composedPath?.();
  if (Array.isArray(eventPath)) {
    for (const pathTarget of eventPath) {
      const wndElement = getBacklinkDocumentClosestWndElement(pathTarget);
      if (wndElement) {
        return wndElement;
      }
    }
  }

  return getBacklinkDocumentClosestWndElement(target);
}

export function getBacklinkDocumentWndElementFromProtyle(protyle = null) {
  return (
    getBacklinkDocumentWndElementFromTarget(protyle?.contentElement) ||
    getBacklinkDocumentWndElementFromTarget(protyle?.wysiwyg?.element) ||
    getBacklinkDocumentWndElementFromTarget(protyle?.element) ||
    null
  );
}

export function resolveBacklinkDocumentPreClickOpenAreaFromWndElements({
  currentWndElement = null,
  focusedWndElement = null,
} = {}) {
  if (!currentWndElement || !focusedWndElement) {
    return "right";
  }

  return focusedWndElement === currentWndElement ? "right" : "main";
}

export function resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache({
  currentWndElement = null,
  cachedFocusedWndElement = null,
  documentRef = globalThis.document,
} = {}) {
  if (!cachedFocusedWndElement) {
    return "right";
  }

  return resolveBacklinkDocumentPreClickOpenAreaFromWndElements({
    currentWndElement,
    focusedWndElement: cachedFocusedWndElement,
  });
}

function getBacklinkDocumentCurrentWndElement(currentTab = null) {
  const currentWnd = getBacklinkDocumentCurrentWnd(currentTab);
  if (currentWnd?.element) {
    return currentWnd.element;
  }

  const currentTabHeadElement = getBacklinkDocumentCurrentTabHeadElement(
    currentTab,
  );
  if (typeof currentTabHeadElement?.closest === "function") {
    return currentTabHeadElement.closest(".layout__wnd");
  }

  const currentElement = currentTab?.element;
  if (typeof currentElement?.closest === "function") {
    return currentElement.closest(".layout__wnd");
  }

  return null;
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
  return resolveBacklinkDocumentPreClickOpenAreaFromWndElements({
    currentWndElement: getBacklinkDocumentCurrentWndElement(currentTab),
    focusedWndElement: getBacklinkDocumentFocusedWndElement(documentRef),
  });
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

function getBacklinkDocumentTabElementDebugInfo(element) {
  if (!element) {
    return null;
  }

  return {
    id: element.id || null,
    dataId:
      typeof element.getAttribute === "function"
        ? element.getAttribute("data-id")
        : null,
    className: element.className || "",
    isFocused: Boolean(element.classList?.contains?.("item--focus")),
  };
}

function getBacklinkDocumentElementDebugInfo(element) {
  if (!element) {
    return null;
  }

  return {
    tagName: element.tagName || null,
    id: element.id || null,
    className: element.className || "",
  };
}

export function getBacklinkDocumentOpenDebugSnapshot({
  currentTab = null,
  documentRef = globalThis.document,
} = {}) {
  const currentTabHeadElement = getBacklinkDocumentCurrentTabHeadElement(
    currentTab,
  );
  const currentWndElement = getBacklinkDocumentCurrentWndElement(currentTab);
  const activeElement = documentRef?.activeElement || null;
  const focusedWndElement = getBacklinkDocumentFocusedWndElement(documentRef);
  const activeWndElement =
    documentRef?.querySelector?.("div.layout__wnd--active") || null;
  const activeTabElement =
    documentRef?.querySelector?.("li.item--focus") || null;

  return {
    currentTab: getBacklinkDocumentTabElementDebugInfo(currentTabHeadElement),
    activeTab: getBacklinkDocumentTabElementDebugInfo(activeTabElement),
    activeElement: getBacklinkDocumentElementDebugInfo(activeElement),
    focusedWnd: getBacklinkDocumentWndElementDebugInfo(focusedWndElement),
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

  return preClickOpenArea === "main" ? "main" : "right";
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

  const currentWnd = getBacklinkDocumentCurrentWnd(currentTab);
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
