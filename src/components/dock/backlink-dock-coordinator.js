/**
 * 侧面板 Dock 调度协调模块
 * 处理主编辑区文档切换、Dock 展开/折叠、移动端侧栏显示时的文档 ID 更新策略。
 */

/**
 * 处理主编辑区 switch-protyle 文档切换事件
 * 规则：
 * 1. 若当前 Dock 已有显示的文档 (currentRootId 存在)，则切换文档时保持原文档 rootId 不变；
 * 2. 若当前 Dock 尚未初始化文档 (!currentRootId) 且处于激活状态，则允许初始化为新文档；
 * 3. 始终更新 lastRootId 以记录最新访问的文档 ID，供后续点击右上角刷新按钮时使用。
 *
 * @param {Object} params
 * @param {string} [params.currentRootId] 当前 Dock 绑定的文档 ID
 * @param {string} [params.incomingRootId] 切换事件带来的文档 ID
 * @param {boolean} [params.dockActive] 当前 Dock 是否处于激活/展开状态
 * @returns {{ nextRootId: string, nextLastRootId: string }}
 */
export function resolveDockSwitchProtyleRootId({
  currentRootId = "",
  incomingRootId = "",
  dockActive = true,
} = {}) {
  const nextLastRootId = incomingRootId || "";
  if (!currentRootId && dockActive && incomingRootId) {
    return {
      nextRootId: incomingRootId,
      nextLastRootId,
    };
  }

  return {
    nextRootId: currentRootId || "",
    nextLastRootId,
  };
}

/**
 * 处理 Dock 尺寸调整 / 展开折叠事件
 * 规则：
 * 1. 侧栏展开 (clientWidth > 0) 时标记 dockActive = true；若尚未有 currentRootId，则赋初值；已有时保持不变；
 * 2. 侧栏折叠 (clientWidth <= 0) 时标记 dockActive = false。
 *
 * @param {Object} params
 * @param {string} [params.currentRootId] 当前 Dock 绑定的文档 ID
 * @param {number} [params.clientWidth] Dock 容器宽度
 * @param {string} [params.lastRootId] 记录的最近文档 ID
 * @param {string} [params.fallbackDocId] 全局备选文档 ID
 * @returns {{ dockActive: boolean, nextRootId: string }}
 */
export function resolveDockResizeState({
  currentRootId = "",
  clientWidth = 0,
  lastRootId = "",
  fallbackDocId = "",
} = {}) {
  if (typeof clientWidth === "number" && clientWidth > 0) {
    const nextRootId = currentRootId || lastRootId || fallbackDocId || "";
    return {
      dockActive: true,
      nextRootId,
    };
  }

  return {
    dockActive: false,
    nextRootId: currentRootId || "",
  };
}

/**
 * 处理移动端侧栏展开/收起状态变更
 *
 * @param {Object} params
 * @param {string} [params.currentRootId] 当前 Dock 绑定的文档 ID
 * @param {boolean} [params.hasTransform] 侧栏是否处于展开变换状态
 * @param {string} [params.lastRootId] 记录的最近文档 ID
 * @param {string} [params.fallbackDocId] 全局备选文档 ID
 * @returns {{ dockActive: boolean, nextRootId: string }}
 */
export function resolveDockMobileSidebarState({
  currentRootId = "",
  hasTransform = false,
  lastRootId = "",
  fallbackDocId = "",
} = {}) {
  if (hasTransform) {
    const nextRootId = currentRootId || lastRootId || fallbackDocId || "";
    return {
      dockActive: true,
      nextRootId,
    };
  }

  return {
    dockActive: false,
    nextRootId: currentRootId || "",
  };
}
