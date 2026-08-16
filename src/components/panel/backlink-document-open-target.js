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

/**
 * 查找指定 rootId 文档在工作区中的打开信息（包含 Tab 对象、Protyle 实例、DOM 容器等）
 * 支持 SiYuan layout 树遍历与 DOM 检索，自动排除反链面板内部的预览 Protyle
 */
export function findOpenedDocumentInfo(
  rootId,
  { documentRef = globalThis.document, windowRef = globalThis.window } = {},
) {
  if (!rootId) {
    return null;
  }

  // 1. 尝试从 window.siyuan.layout.center 模型树中检索 Tab
  const center = windowRef?.siyuan?.layout?.center;
  if (center) {
    const tabs = [];
    const collectTabs = (node) => {
      if (!node) return;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          collectTabs(child);
        }
      }
      if (node.headElement && (node.model || node.doc || node.panelElement)) {
        tabs.push(node);
      }
    };
    collectTabs(center);

    for (const tab of tabs) {
      const tabRootId =
        tab.doc?.id ||
        tab.model?.editor?.protyle?.block?.rootID ||
        tab.model?.protyle?.block?.rootID ||
        tab.headElement?.getAttribute?.("data-node-id") ||
        tab.panelElement?.querySelector?.(".protyle-title")?.getAttribute?.("data-node-id");

      if (tabRootId === rootId) {
        return {
          tab,
          editorElement:
            tab.panelElement ||
            tab.model?.editor?.protyle?.element ||
            tab.model?.protyle?.element ||
            null,
          tabHeadElement: tab.headElement || null,
          protyle:
            tab.model?.editor?.protyle ||
            tab.model?.protyle ||
            null,
        };
      }
    }
  }

  // 2. 从 DOM 中检索主工作区的 Protyle 容器
  if (documentRef?.querySelectorAll) {
    // 优先匹配包含对应 rootId 标题或背景属性的 protyle 容器
    const titleElements = documentRef.querySelectorAll(
      `.protyle-title[data-node-id="${rootId}"], .protyle-background[data-node-id="${rootId}"]`,
    );
    for (const titleEl of titleElements) {
      const editorEl = titleEl.closest?.(".protyle");
      if (
        editorEl &&
        !editorEl.closest?.(".backlink-panel__area") &&
        !editorEl.closest?.(".sy__backlink")
      ) {
        const tabDataId = editorEl.getAttribute?.("data-id");
        const tabHead = tabDataId
          ? documentRef.querySelector(
              `ul.layout-tab-bar > li.item[data-id="${tabDataId}"]`,
            )
          : null;
        return {
          tab: null,
          editorElement: editorEl,
          tabHeadElement: tabHead,
          protyle: null,
        };
      }
    }

    // 检索主工作区（layout__center 或 layout-tab-container）中的 protyle
    const centerProtyles = documentRef.querySelectorAll(
      `.layout__center .protyle, .layout-tab-container > .protyle`,
    );
    for (const editorEl of centerProtyles) {
      if (
        editorEl.closest?.(".backlink-panel__area") ||
        editorEl.closest?.(".sy__backlink")
      ) {
        continue;
      }
      const docId =
        editorEl.querySelector?.(".protyle-title")?.getAttribute?.("data-node-id") ||
        editorEl.querySelector?.(".protyle-background")?.getAttribute?.("data-node-id");
      if (docId === rootId) {
        const tabDataId = editorEl.getAttribute?.("data-id");
        const tabHead = tabDataId
          ? documentRef.querySelector(
              `ul.layout-tab-bar > li.item[data-id="${tabDataId}"]`,
            )
          : null;
        return {
          tab: null,
          editorElement: editorEl,
          tabHeadElement: tabHead,
          protyle: null,
        };
      }
    }
  }

  return null;
}

/**
 * 查找指定 rootId 文档在主工作区中已打开的 Protyle 编辑器容器
 */
export function findOpenedDocumentEditorElement(
  rootId,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
) {
  const docInfo = findOpenedDocumentInfo(rootId, { documentRef, windowRef });
  return docInfo?.editorElement || null;
}

/**
 * 激活已打开编辑器的对应页签 Tab
 */
export function activateOpenedDocumentTab(
  docInfoOrElement,
  documentRef = globalThis.document,
) {
  if (!docInfoOrElement) {
    return false;
  }

  const tab = docInfoOrElement.tab;
  if (tab?.parent && typeof tab.parent.switchTab === "function") {
    tab.parent.switchTab(tab);
    return true;
  }

  const editorElement = docInfoOrElement.editorElement || docInfoOrElement;
  const tabHead =
    docInfoOrElement.tabHeadElement ||
    (editorElement?.getAttribute
      ? documentRef?.querySelector?.(
          `ul.layout-tab-bar > li.item[data-id="${editorElement.getAttribute(
            "data-id",
          )}"]`,
        )
      : null);

  if (tabHead) {
    tabHead.click?.();
    tabHead.dispatchEvent?.(new MouseEvent("click", { bubbles: true }));
    const wnd = tabHead.closest?.(".layout__wnd");
    if (wnd && !wnd.classList?.contains?.("layout__wnd--active")) {
      wnd.classList?.add?.("layout__wnd--active");
    }
    return true;
  }

  return false;
}

/**
 * 在已打开的文档编辑器内直接跳转定位
 * - 如果是文档本身（isDocument 为 true），平滑滚动到文档开头 (top: 0) 并聚焦标题
 * - 如果是具体块，平滑滚动居中定位并触发高亮闪烁动画
 * - 返回 true 表示成功定位（无需重复打开新 Tab）
 */
export function navigateToOpenedDocumentBlock({
  rootId,
  blockId,
  isDocument = false,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  openTabFn = null,
  app = null,
} = {}) {
  if (!rootId) {
    return false;
  }

  const docInfo = findOpenedDocumentInfo(rootId, { documentRef, windowRef });
  if (!docInfo || (!docInfo.editorElement && !docInfo.tab)) {
    return false;
  }

  const { tab, editorElement, protyle } = docInfo;

  // 1. 激活并聚焦该 Tab
  activateOpenedDocumentTab(docInfo, documentRef);

  const isTargetDocRoot = isDocument || !blockId || blockId === rootId;

  // 2. 如果目标是文档本身 -> 滚动到文档顶部并聚焦标题
  if (isTargetDocRoot) {
    const scrollContainer =
      editorElement?.querySelector?.(".protyle-content") ||
      editorElement?.querySelector?.(".protyle-wysiwyg") ||
      editorElement;

    if (scrollContainer) {
      if (typeof scrollContainer.scrollTo === "function") {
        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        scrollContainer.scrollTop = 0;
      }
    }
    const titleInput = editorElement?.querySelector?.(".protyle-title__input");
    titleInput?.focus?.();
    return true;
  }

  // 3. 如果目标是具体块
  // 优先通过 Protyle 实例的 scroll 方法精准定位（自动拉取长文档虚拟滚动数据）
  if (protyle && typeof protyle.scroll === "function") {
    protyle.scroll(blockId, 0, () => {
      const blockEl = editorElement?.querySelector?.(
        `[data-node-id="${blockId}"]`,
      );
      if (blockEl) {
        blockEl.classList?.add?.("protyle-wysiwyg--hl");
        setTimeout(() => {
          blockEl.classList?.remove?.("protyle-wysiwyg--hl");
        }, 1500);
      }
    });
    return true;
  }

  // 其次直接在 DOM 中检索并滚动定位
  if (editorElement) {
    const blockElement = editorElement.querySelector?.(
      `[data-node-id="${blockId}"]`,
    );
    if (blockElement) {
      if (typeof blockElement.scrollIntoView === "function") {
        blockElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      blockElement.classList?.add?.("protyle-wysiwyg--hl");
      setTimeout(() => {
        blockElement.classList?.remove?.("protyle-wysiwyg--hl");
      }, 1500);
      return true;
    }
  }

  // 若 DOM 处于虚拟分块未渲染状态，通过 openTab 复用已有 Tab
  if (typeof openTabFn === "function" && app) {
    try {
      openTabFn({
        app,
        doc: {
          id: blockId,
          action: ["cb-get-hl", "cb-get-context", "cb-get-rootscroll"],
        },
        openNewTab: false,
      });
      return true;
    } catch (_) {
      // 容错继续
    }
  }

  // 既然已在打开的文档中激活了 Tab，直接返回 true，避免外部 fallthrough 重复开 Tab
  return true;
}
