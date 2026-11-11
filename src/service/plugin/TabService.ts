import { EnvConfig } from "@/config/EnvConfig";
import BacklinkFilterPanelPageSvelte from "@/components/panel/backlink-filter-panel-page.svelte";
import Instance from "@/utils/Instance";
import { openTab } from "siyuan";
import { CUSTOM_ICON_MAP } from "@/models/icon-constant";
import { isStrBlank } from "@/utils/string-util";
import { clearProtyleGutters, getActiveTab } from "@/utils/html-util";
import { CacheManager } from "@/config/CacheManager";
import { logWarn } from "@/utils/logger";
import {
    attachBacklinkPanelScrollCleanup,
    buildBacklinkPanelPageProps,
    destroyBacklinkPanelHost,
} from "./backlink-panel-host.js";


const BACKLINK_TAB_PREFIX = "backlink_tab_"

export class TabService {


    public static get ins(): TabService {
        return Instance.get(TabService);
    }

    public init() {
        EnvConfig.ins.plugin.addCommand({
            langKey: "showDocumentBacklinkPanelTab",
            langText: "显示当前文档反链管家页签",
            hotkey: "⌥⇧T",
            editorCallback: () => {
                TabService.ins.openBacklinkTabForActiveDocument();
            },
        });



        // 用来修复反链管家新窗口打开时，没有初始化该页签ID，导致显示空白的问题 https://github.com/Misuzu2027/siyuan-backlink-manager/issues/23
        // 初始化时查看有没有销毁的ID，有的话初始化tab。
        // let destoryDocIdArray = CacheManager.ins.getAndRemoveBacklinkDestroyTabDocIdArray();
        // for (const docId of destoryDocIdArray) {
        //     this.pluginAddTab(docId, null);
        // }

    }    /**
     * 读取当前活动文档页签的标题与文档 ID 并打开对应反链页签；
     * 顶栏图标（TopBarService）与编辑器命令共用此入口。
     */
    public openBacklinkTabForActiveDocument() {
        let currentDocument: HTMLDivElement = getActiveTab();
        if (!currentDocument) {
            return;
        }

        const docTitleElement = currentDocument.querySelector(".protyle-title");
        let docTitle = currentDocument.querySelector("div.protyle-title__input").textContent;
        let docId = docTitleElement.getAttribute("data-node-id");
        TabService.ins.openBacklinkTab(docTitle, docId, null);
    }

    public pluginAddTab(docId: string, focusBlockId: string) {
        let tabId = BACKLINK_TAB_PREFIX + docId;
        let backlinkFilterPanelPageSvelte: BacklinkFilterPanelPageSvelte;
        let detachScrollCleanup: () => void;

        EnvConfig.ins.plugin.addTab({
            type: tabId,
            init() {
                backlinkFilterPanelPageSvelte = new BacklinkFilterPanelPageSvelte({
                    target: this.element,
                    props: buildBacklinkPanelPageProps({
                        rootId: docId,
                        focusBlockId: focusBlockId,
                        panelBacklinkViewExpand: true,
                        currentTab: this,
                    }),
                });

                detachScrollCleanup = attachBacklinkPanelScrollCleanup({
                    element: this.element,
                    // SiYuan 的 Tab.element 类型声明为 Element，运行时实际是 HTMLElement 容器
                    onCleanup: () => clearProtyleGutters(this.element as HTMLElement),
                });
            },
            beforeDestroy() {
                destroyBacklinkPanelHost({
                    panelInstance: backlinkFilterPanelPageSvelte,
                    detachScrollCleanup,
                });
            },
            destroy() {
            },
            resize() {

            },
            update() {
            }
        });

    }


    public openBacklinkTab(docTitle: string, docId: string, focusBlockId: string) {
        if (isStrBlank(docTitle) || isStrBlank(docId)) {
            logWarn("反链管家插件 打开反链页签错误，参数缺失")
            return;
        }

        let tabId = BACKLINK_TAB_PREFIX + docId;

        this.pluginAddTab(docId, focusBlockId);

        CacheManager.ins.addBacklinkDestroyTabDocId(docId);

        openTab({
            app: EnvConfig.ins.app,
            custom: {
                id: EnvConfig.ins.plugin.name + tabId,
                icon: CUSTOM_ICON_MAP.BacklinkPanelFilter.id,
                title: docTitle,
                // data: { rootId: docId, focusBlockId: focusBlockId }
            },
            position: "right",
            afterOpen() {
            }
        });
    }

}
