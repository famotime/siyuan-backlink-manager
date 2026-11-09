/**
 * 已打开文档子域：在主工作区中查找已打开的文档编辑器、激活对应页签并定位块。
 * 与打开区域决策（backlink-document-open-target.js）保持单向依赖，禁止反向引用。
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
