/**
 * 按文档 ID 查找反链文档列表项与其编辑器容器元素。
 * controller 的渲染目标解析与 navigation 的面包屑/层级跳转共用此实现。
 */

/**
 * 查找文档列表项元素：优先选择器精确匹配，退化为遍历 data-node-id。
 * @param {Element|null} panelULElement 反链面板列表容器
 * @param {string} documentId 文档 ID
 * @returns {Element|null}
 */
export function findBacklinkDocumentLiElement(panelULElement, documentId) {
  if (!documentId || !panelULElement) {
    return null;
  }

  return (
    (typeof panelULElement.querySelector === "function"
      ? panelULElement.querySelector(
          `.list-item__document-name[data-node-id="${documentId}"]`,
        )
      : null) ||
    (typeof panelULElement.querySelectorAll === "function"
      ? Array.from(
          panelULElement.querySelectorAll(".list-item__document-name"),
        ).find((element) => element.getAttribute?.("data-node-id") === documentId)
      : null) ||
    null
  );
}

/**
 * 查找文档对应的编辑器元素：卡片内 → 兄弟节点 → 面板 data 属性兜底。
 * @param {Element|null} documentLiElement 文档列表项元素
 * @param {Element|null} panelULElement 反链面板列表容器
 * @param {string} documentId 文档 ID
 * @param {Object} [options]
 * @param {boolean} [options.fallbackToSibling] 面板兜底失败时是否回退到兄弟节点本体（面包屑跳转场景）
 * @returns {Element|null}
 */
export function findBacklinkDocumentEditorElement(
  documentLiElement,
  panelULElement,
  documentId,
  { fallbackToSibling = false } = {},
) {
  return (
    documentLiElement?.closest?.(".backlink-card")?.querySelector?.(
      ".backlink-document-editor",
    ) ||
    documentLiElement?.nextElementSibling?.querySelector?.(
      ".backlink-document-editor",
    ) ||
    (typeof panelULElement?.querySelector === "function"
      ? panelULElement.querySelector(
          `.backlink-document-editor[data-backlink-root-id="${documentId}"]`,
        )
      : null) ||
    (fallbackToSibling ? documentLiElement?.nextElementSibling : null) ||
    null
  );
}

/**
 * 组合查找渲染目标（列表项 + 编辑器元素）。
 * @param {Element|null} panelULElement 反链面板列表容器
 * @param {string} documentId 文档 ID
 * @returns {{documentLiElement: Element|null, editorElement: Element|null}}
 */
export function findBacklinkDocumentRenderTargets(panelULElement, documentId) {
  if (!documentId || !panelULElement) {
    return { documentLiElement: null, editorElement: null };
  }

  const documentLiElement = findBacklinkDocumentLiElement(panelULElement, documentId);
  const editorElement = findBacklinkDocumentEditorElement(
    documentLiElement,
    panelULElement,
    documentId,
  );

  return {
    documentLiElement: documentLiElement || null,
    editorElement: editorElement || null,
  };
}
