/**
 * 文档标题图标菜单子域：在编辑器标题右键菜单中注册「反链管家」层级动作。
 * 自 DocumentService.ts 抽离，宿主服务通过依赖注入传入面板刷新/销毁与设置读取，
 * 保持本模块可被 node:test 直接导入（不使用路径别名、无思源运行时依赖）。
 * @param {Object} [handlers] 依赖注入的面板操作集合
 * @param {Function} [handlers.updateDocumentBottomShowPanel] 更新文档底部面板显示设置
 * @param {Function} [handlers.isDocumentBottomDisplayEnabled] 判断文档底部显示是否启用
 * @param {Function} [handlers.refreshBacklinkPanelToBottom] 刷新文档底部反链面板
 * @param {Function} [handlers.handleDestroyProtyle] 处理编辑器销毁事件
 * @param {Function} [handlers.destroyPanel] 销毁反链面板实例
 * @param {Object} [handlers.i18n] 插件 i18n 文案对象（菜单标签），缺省回退中文
 */
export function createDocumentTitleIconMenuHandlers({
    updateDocumentBottomShowPanel,
    isDocumentBottomDisplayEnabled,
    refreshBacklinkPanelToBottom,
    handleDestroyProtyle,
    destroyPanel,
    i18n = {},
} = {}) {
    function getDocumentBlockIconMenus(e) {
        let rootId = e.detail.data.rootID;
        if (!rootId) {
            return;
        }
        let submenus = [];
        submenus.push({
            label: i18n?.menuReset || "恢复默认",
            click: async () => {
                await updateDocumentBottomShowPanel(rootId, null);
                if (isDocumentBottomDisplayEnabled()) {
                    let documentContentElement = e.detail.protyle.contentElement;
                    await refreshBacklinkPanelToBottom(documentContentElement, rootId, null);
                } else {
                    handleDestroyProtyle(e);
                }
            }
        });
        submenus.push({
            label: i18n?.menuShowBottomPanel || "始终显示该文档底部反链",
            click: async () => {
                await updateDocumentBottomShowPanel(rootId, 1);

                let documentContentElement = e.detail.protyle.contentElement;
                await refreshBacklinkPanelToBottom(documentContentElement, rootId, null);
            }
        });
        submenus.push({
            label: i18n?.menuHideBottomPanel || "始终隐藏该文档底部反链",
            click: async () => {
                updateDocumentBottomShowPanel(rootId, -1);
                let documentContentElement = e.detail.protyle.contentElement;
                destroyPanel(documentContentElement);
            }
        });

        return submenus;
    }

    function handleClickEditorTitleIcon(e) {
        (e.detail.menu).addItem({
            icon: "iconBacklinkPanelFilter",
            type: "submenu",
            label: "反链管家",
            submenu: getDocumentBlockIconMenus(e)
        });
    }

    return {
        handleClickEditorTitleIcon,
    };
}
