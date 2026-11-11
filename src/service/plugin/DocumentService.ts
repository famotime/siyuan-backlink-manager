import { EnvConfig } from "@/config/EnvConfig";
import BacklinkFilterPanelPageSvelte from "@/components/panel/backlink-filter-panel-page.svelte";
import { SettingService } from "@/service/setting/SettingService";
import Instance from "@/utils/Instance";
import { BacklinkFilterPanelAttributeService, DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY } from "@/service/setting/BacklinkPanelFilterCriteriaService";
import { clearProtyleGutters, hasClosestByClassName, hasClosestById } from "@/utils/html-util";
import { generateGetDocHasBacklinksSql } from "../backlink/backlink-sql";
import { sql } from "@/utils/api";
import { NewNodeID } from "@/utils/siyuan-util";
import {
    attachBacklinkPanelScrollCleanup,
    buildBacklinkPanelPageProps,
    destroyBacklinkPanelHost,
    getBacklinkPanelPageFocusBlockId,
    updateBacklinkPanelPageProps,
} from "./backlink-panel-host.js";
import { mountOrUpdateDocumentBottomBacklinkHost } from "./document-backlink-host-lifecycle.js";
import { shouldIgnoreDocumentBottomBacklinkForProtyle } from "./document-protyle-guard.js";
import { createDocumentTitleIconMenuHandlers } from "./document-title-icon-menus.js";


let backlinkPanelPageSvelteMap: Map<string, BacklinkFilterPanelPageSvelte> = new Map();
let backlinkPanelScrollCleanupMap: Map<string, () => void> = new Map();
let documentProtyleElementMap: Map<string, HTMLElement> = new Map();

// 标题图标菜单处理器：面板刷新/销毁与设置读取通过依赖注入接入
const titleIconMenuHandlers = createDocumentTitleIconMenuHandlers({
    updateDocumentBottomShowPanel: (rootId, value) =>
        BacklinkFilterPanelAttributeService.ins.updateDocumentBottomShowPanel(rootId, value),
    isDocumentBottomDisplayEnabled: () => SettingService.ins.SettingConfig.documentBottomDisplay,
    refreshBacklinkPanelToBottom,
    handleDestroyProtyle,
    destroyPanel,
    i18n: EnvConfig.ins.i18n,
});


export class DocumentService {

    public static get ins(): DocumentService {
        return Instance.get(DocumentService);
    }

    public init() {
        EnvConfig.ins.plugin.eventBus.on("loaded-protyle-static", (e: any) => {
            handleSwitchProtyleOrLoadedProtyleStatic(e);
        });

        EnvConfig.ins.plugin.eventBus.on("switch-protyle", (e: any) => {
            handleSwitchProtyleOrLoadedProtyleStatic(e);
        });

        EnvConfig.ins.plugin.eventBus.on("destroy-protyle", (e: any) => {
            handleDestroyProtyle(e);
        });

        EnvConfig.ins.plugin.eventBus.on("click-editortitleicon", (e: any) => {
            titleIconMenuHandlers.handleClickEditorTitleIcon(e);
        });
        // EnvConfig.ins.plugin.addCommand({
        //     langKey: "showDocumentBottomBacklinkPanel",
        //     langText: "始终显示底部反链面板",
        //     hotkey: "⌥⇧⌘A",
        //     editorCallback: (protyle: any) => {
        //     },
        // });

        intervalSetNodePaddingBottom();
    }

    public destroy() {
        destroyAllPanel();
        destroyIntervalSetNodePaddingBottom();
    }
}

async function handleSwitchProtyleOrLoadedProtyleStatic(e) {
    if (!e || !e.detail || !e.detail.protyle) {
        return;
    }

    let documentContentElement = e.detail.protyle.contentElement as HTMLElement;
    if (shouldIgnoreDocumentBottomBacklinkForProtyle(documentContentElement, {
        hasClosestByClassName,
    })) {
        return;
    }
    let rootId = e.detail.protyle.block.rootID;
    let focusBlockId = getBacklinkPanelPageFocusBlockId(e.detail.protyle);
    if (!rootId) {
        return;
    }
    await refreshBacklinkPanelToBottom(documentContentElement, rootId, focusBlockId);

}

function handleDestroyProtyle(e) {
    // let rootId = e.detail.protyle.block.rootID;
    // documentProtyleElementMap.delete(rootId);

    let documentContentElement = e.detail.protyle.contentElement as HTMLElement;
    if (!documentContentElement) {
        return;

    }
    destroyPanel(documentContentElement);
}

async function getDocumentBottomBacklinkPanelDisplay(documentContentElement: HTMLElement, rootId: string) {
    if (shouldIgnoreDocumentBottomBacklinkForProtyle(documentContentElement, {
        hasClosestByClassName,
    })) {
        return false;
    }
    // 如果是闪卡界面，不显示底部反链面板
    let isCardBlock = hasClosestByClassName(documentContentElement, "card__block")
    if (isCardBlock) {
        let flashCardBottomDisplay = SettingService.ins.SettingConfig.flashCardBottomDisplay;
        if (!flashCardBottomDisplay) {
            return false;
        }
    }
    // 必须是页签文档或悬浮窗才可以通过。防止 Dock 栏的插件渲染 protyle 加载反链。
    let isLayoutCenter = hasClosestByClassName(documentContentElement, "layout__center");
    let isPopoverBlock = hasClosestByClassName(documentContentElement, "block__popover");
    // 搜索弹窗的预览也显示底部反链面板，fn__flex-1 search__preview protyle
    let isSearchDialog = hasClosestById(documentContentElement, "searchPreview");
    if (!isLayoutCenter && !isPopoverBlock && !isSearchDialog) {
        return false;
    }

    let documentBottomDisplay = SettingService.ins.SettingConfig.documentBottomDisplay;

    if (documentBottomDisplay) {
        let hasBacklinksSql = generateGetDocHasBacklinksSql(rootId);
        let backlinkCountResult = await sql(hasBacklinksSql);
        if (!backlinkCountResult || !backlinkCountResult[0] || !backlinkCountResult[0].count) {
            documentBottomDisplay = false;
        }
    }
    let docProtyleElement = null;
    if (documentContentElement.matches(".protyle-wysiwyg--attr")) {
        docProtyleElement = documentContentElement;
    } else {
        docProtyleElement = documentContentElement.querySelector(`div.protyle-wysiwyg--attr[${DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY}]`);
    }

    if (docProtyleElement) {
        let attributeValue = docProtyleElement.getAttribute(DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY);
        if (attributeValue == "1") {
            documentBottomDisplay = true;
        } else if (attributeValue == "-1") {
            documentBottomDisplay = false;
        }
    }

    return documentBottomDisplay;
}


async function refreshBacklinkPanelToBottom(documentContentElement: HTMLElement, rootId: string, focusBlockId: string) {
    if (!documentContentElement || !rootId) {
        return;
    }
    let bottomDisplay = await getDocumentBottomBacklinkPanelDisplay(documentContentElement, rootId);
    // 如果该文档不需要显示，则尝试删除该元素内部可能存在的底部反链。
    if (!bottomDisplay) {
        destroyPanel(documentContentElement);
        return;
    } else {
        addBacklinkPanelToBottom(documentContentElement, rootId, focusBlockId);
    }
}

async function addBacklinkPanelToBottom(documentContentElement: HTMLElement, rootId: string, focusBlockId: string) {
    if (!documentContentElement || !rootId) {
        return;
    }
    const panelBacklinkViewExpand =
        SettingService.ins.SettingConfig.docBottomBacklinkPanelViewExpand;
    const hostResult = mountOrUpdateDocumentBottomBacklinkHost({
        documentContentElement,
        rootId,
        focusBlockId,
        panelBacklinkViewExpand,
        resolvePanelInstance: (panelId) => backlinkPanelPageSvelteMap.get(panelId),
        updatePanelProps: updateBacklinkPanelPageProps,
        destroyExistingHost: destroyPanel,
        mountNewHost: createDocumentBottomBacklinkHost,
    });
    if (hostResult?.action === "update") {
        return;
    }
}

function createDocumentBottomBacklinkHost(documentContentElement: HTMLElement, rootId: string, focusBlockId: string) {
    const protyleWysiwygElement = documentContentElement.querySelector(".protyle-wysiwyg.protyle-wysiwyg--attr");
    const backlinkPanelBottomElement = document.createElement("div");
    backlinkPanelBottomElement.classList.add(
        "backlink-panel-document-bottom__area"
    );

    let isMobile = EnvConfig.ins.isMobile;
    if (isMobile) {
        backlinkPanelBottomElement.classList.add("document-panel-plugin-mobile");
    }

    documentContentElement.appendChild(backlinkPanelBottomElement);
    let panelId = NewNodeID();
    backlinkPanelBottomElement.setAttribute("data-root-id", rootId);
    backlinkPanelBottomElement.setAttribute("misuzu-backlink-panel-id", panelId)

    // let hrElement = document.createElement("hr");
    // backlinkPanelBottomElement.appendChild(hrElement);

    let docBottomBacklinkPanelViewExpand = SettingService.ins.SettingConfig.docBottomBacklinkPanelViewExpand

    let pageSvelte = new BacklinkFilterPanelPageSvelte({
        target: backlinkPanelBottomElement,
        props: buildBacklinkPanelPageProps({
            rootId: rootId,
            focusBlockId: focusBlockId,
            currentTab: null,
            panelBacklinkViewExpand: docBottomBacklinkPanelViewExpand,
        }),
    });
    let detachScrollCleanup = attachBacklinkPanelScrollCleanup({
        element: backlinkPanelBottomElement.parentElement,
        onCleanup: () => clearProtyleGutters(backlinkPanelBottomElement as HTMLElement),
    });
    backlinkPanelBottomElement.addEventListener("mouseover", (event: MouseEvent) => {
        // const target = event.target as HTMLElement;
        //
        // // 如果元素包含 aria-label 样式，则不阻止事件传播
        // if (target.classList.contains('ariaLabel')) {
        //     return; // 不做任何操作，继续传播
        // } else {
        //     document.getElementById("tooltip").classList.add("fn__none");
        // }
        //
        // // 考虑创建一个隐藏的 blockref 来显示悬浮窗，子文档列表挂件中好像有相似代码。
        // if (target.getAttribute('data-type') === 'block-ref') {
        //     event.stopPropagation();
        //
        // }

        event.stopPropagation();
    })


    backlinkPanelPageSvelteMap.set(panelId, pageSvelte);
    backlinkPanelScrollCleanupMap.set(panelId, detachScrollCleanup);
    documentProtyleElementMap.set(panelId, protyleWysiwygElement as HTMLElement);
    // handleProtyleHeightChange(protyleElement)
}


function destroyPanel(documentContentElement: HTMLElement) {
    if (!documentContentElement) {
        return;
    }
    let backlinkPanelBottomElement = documentContentElement.querySelector(".backlink-panel-document-bottom__area");
    if (!backlinkPanelBottomElement) {
        return;
    }
    let panelId = backlinkPanelBottomElement.getAttribute("misuzu-backlink-panel-id");
    if (!panelId) {
        return;
    }
    documentProtyleElementMap.delete(panelId);
    let pageSvelte = backlinkPanelPageSvelteMap.get(panelId);
    let detachScrollCleanup = backlinkPanelScrollCleanupMap.get(panelId);
    if (!pageSvelte) {
        backlinkPanelScrollCleanupMap.delete(panelId);
        return;
    }
    backlinkPanelPageSvelteMap.delete(panelId);
    backlinkPanelScrollCleanupMap.delete(panelId);
    destroyBacklinkPanelHost({
        panelInstance: pageSvelte,
        detachScrollCleanup,
    });
    backlinkPanelBottomElement.remove();

}

function destroyAllPanel() {

    let allDocumentContentElementArray = document.querySelectorAll("div.layout__center div.layout-tab-container div.protyle-content.protyle-content--transition");

    if (!allDocumentContentElementArray) {
        return;
    }
    for (const documentContentElement of allDocumentContentElementArray) {
        destroyPanel(documentContentElement as HTMLElement);

    }

}

let intervalId;
function intervalSetNodePaddingBottom() {
    // 以 50ms 轮询同步文档底部面板的 padding：思源编辑器的布局尺寸变化没有可靠的
    // 回调入口（ResizeObserver 对编辑器内部结构改动仍需实机验证），当前轮询开销可控
    intervalId = setInterval(() => {
        if (documentProtyleElementMap.size <= 0) {
            return;
        }
        let paddingWidthSize = SettingService.ins.SettingConfig.documentBottomBacklinkPaddingWidth;

        let paddingBottomSize = "48px";
        for (const key of documentProtyleElementMap.keys()) {
            let protyleElement = documentProtyleElementMap.get(key);

            if (parseFloat(protyleElement.style.paddingBottom) > 88) {
                protyleElement.style.paddingBottom = paddingBottomSize;
            }
            let panelElement = protyleElement.parentElement.querySelector(".backlink-panel-document-bottom__area") as HTMLElement;
            if (panelElement && protyleElement.style.paddingLeft != panelElement.style.paddingLeft) {
                let paddingWidthPx = paddingWidthSize + "px";
                if (paddingWidthSize == undefined || paddingWidthSize == null) {
                    paddingWidthPx = protyleElement.style.paddingLeft;
                }
                panelElement.style.paddingLeft = paddingWidthPx;
                panelElement.style.paddingRight = paddingWidthPx;
            }
        }
    }, 50);
}


function destroyIntervalSetNodePaddingBottom() {
    if (intervalId) {
        clearInterval(intervalId);
    }
}
