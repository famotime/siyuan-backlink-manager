/**
 * 文档标题图标菜单子域：在编辑器标题右键菜单中注册「反链管家」层级动作。
 * 自 DocumentService.ts 抽离，宿主服务通过依赖注入传入面板刷新/销毁与设置读取，
 * 保持本模块可被 node:test 直接导入（无 @/ 别名、无思源运行时依赖）。
 */
export function createDocumentTitleIconMenuHandlers({
    updateDocumentBottomShowPanel,
    isDocumentBottomDisplayEnabled,
    refreshBacklinkPanelToBottom,
    handleDestroyProtyle,
    destroyPanel,
} = {}) {
    function getDocumentBlockIconMenus(e) {
        let rootId = e.detail.data.rootID;
        if (!rootId) {
            return;
        }
        let submenus = [];
        submenus.push({
            label: "恢复默认",
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
            label: "始终显示该文档底部反链",
            click: async () => {
                await updateDocumentBottomShowPanel(rootId, 1);

                let documentContentElement = e.detail.protyle.contentElement;
                await refreshBacklinkPanelToBottom(documentContentElement, rootId, null);
            }
        });
        submenus.push({
            label: "始终隐藏该文档底部反链",
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
