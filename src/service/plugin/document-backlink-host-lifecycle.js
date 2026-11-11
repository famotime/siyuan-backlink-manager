/**
 * 文档底部反链宿主的挂载/更新调度：
 * 已有同文档面板则更新 props，异文档面板则先销毁再重新挂载。
 * @param {Object} [options] 参数对象
 * @param {HTMLElement} [options.documentContentElement] 文档内容容器元素
 * @param {string} [options.rootId] 当前文档 ID
 * @param {string|null} [options.focusBlockId] 聚焦块 ID
 * @param {boolean} [options.panelBacklinkViewExpand] 面板展开状态
 * @param {Function} [options.resolvePanelInstance] 按面板 ID 解析已挂载面板实例
 * @param {Function} [options.updatePanelProps] 更新面板 props
 * @param {Function} [options.destroyExistingHost] 销毁现有面板宿主
 * @param {Function} [options.mountNewHost] 挂载新面板宿主
 * @returns {{action: "update"|"mount", panelElement: Element}|undefined}
 */
export function mountOrUpdateDocumentBottomBacklinkHost({
  documentContentElement,
  rootId,
  focusBlockId = null,
  panelBacklinkViewExpand = true,
  resolvePanelInstance,
  updatePanelProps,
  destroyExistingHost,
  mountNewHost,
} = {}) {
  if (!documentContentElement || !rootId) {
    return;
  }

  const backlinkPanelBottomElement = documentContentElement.querySelector(
    ".backlink-panel-document-bottom__area",
  );
  if (backlinkPanelBottomElement) {
    const panelRootId = backlinkPanelBottomElement.getAttribute("data-root-id");
    if (panelRootId == rootId) {
      const panelId = backlinkPanelBottomElement.getAttribute("misuzu-backlink-panel-id");
      const panelInstance = resolvePanelInstance?.(panelId);
      updatePanelProps?.({
        panelInstance,
        rootId,
        focusBlockId,
        currentTab: null,
        panelBacklinkViewExpand,
      });
      return {
        action: "update",
        panelElement: backlinkPanelBottomElement,
      };
    }

    destroyExistingHost?.(documentContentElement);
  }

  mountNewHost?.(documentContentElement, rootId, focusBlockId);
  return {
    action: "mount",
    panelElement: null,
  };
}
