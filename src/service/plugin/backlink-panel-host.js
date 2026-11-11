/**
 * 组装反链面板 Svelte 组件的初始 props。
 * @param {Object} [options] 参数对象
 * @param {string} [options.rootId] 反链面板对应的文档 ID
 * @param {string|null} [options.focusBlockId] 初始聚焦块 ID
 * @param {Object|null} [options.currentTab] 宿主页签实例（独立页签宿主传入）
 * @param {boolean} [options.panelBacklinkViewExpand] 面板初始展开状态
 * @returns {Object} Svelte 组件 props
 */
export function buildBacklinkPanelPageProps({
  rootId,
  focusBlockId = null,
  currentTab = null,
  panelBacklinkViewExpand = true,
} = {}) {
  return {
    rootId,
    focusBlockId,
    currentTab,
    panelBacklinkViewExpand,
  };
}

/**
 * 从 Protyle 编辑器读取当前聚焦块 ID。
 * @param {Object|null} [protyle] Protyle 编辑器实例
 * @returns {string|null}
 */
export function getBacklinkPanelPageFocusBlockId(protyle = null) {
  return protyle?.block?.id || null;
}

/**
 * 更新已存在的反链面板实例 props。
 * @param {Object} [options] 参数对象
 * @param {Object} [options.panelInstance] Svelte 面板组件实例
 * @param {string} [options.rootId] 反链面板对应的文档 ID
 * @param {string|null} [options.focusBlockId] 初始聚焦块 ID
 * @param {Object|null} [options.currentTab] 宿主页签实例
 * @param {boolean} [options.panelBacklinkViewExpand] 面板初始展开状态
 */
export function updateBacklinkPanelPageProps({
  panelInstance,
  rootId,
  focusBlockId = null,
  currentTab = null,
  panelBacklinkViewExpand = true,
} = {}) {
  if (typeof panelInstance?.$set !== "function") {
    return;
  }

  panelInstance.$set(
    buildBacklinkPanelPageProps({
      rootId,
      focusBlockId,
      currentTab,
      panelBacklinkViewExpand,
    }),
  );
}

/**
 * 绑定宿主容器滚动监听，滚动时触发清理回调（如清理 protyle 侧边槽）。
 * @param {Object} [options] 参数对象
 * @param {Element} [options.element] 宿主容器元素
 * @param {Function} [options.onCleanup] 滚动触发的清理回调
 * @returns {() => void} 解绑函数
 */
export function attachBacklinkPanelScrollCleanup({
  element,
  onCleanup,
} = {}) {
  if (!element || typeof element.addEventListener !== "function") {
    return () => {};
  }

  const handleScroll = () => {
    onCleanup?.();
  };

  element.addEventListener("scroll", handleScroll);
  return () => {
    if (typeof element.removeEventListener === "function") {
      element.removeEventListener("scroll", handleScroll);
    }
  };
}

/**
 * 销毁反链面板宿主：解绑滚动监听并销毁 Svelte 组件实例。
 * @param {Object} [options] 参数对象
 * @param {Object} [options.panelInstance] Svelte 面板组件实例
 * @param {Function} [options.detachScrollCleanup] 滚动监听解绑函数
 */
export function destroyBacklinkPanelHost({
  panelInstance,
  detachScrollCleanup,
} = {}) {
  detachScrollCleanup?.();
  panelInstance?.$destroy?.();
}
