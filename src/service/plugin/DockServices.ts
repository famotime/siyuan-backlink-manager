import { EnvConfig } from "@/config/EnvConfig";
import { CUSTOM_ICON_MAP } from "@/models/icon-constant";
import Instance from "@/utils/Instance";
import BacklinkPanelDockSvelte from "@/components/dock/backlink-filter-panel-dock.svelte";
import { SettingService } from "@/service/setting/SettingService";
import { clearProtyleGutters } from "@/utils/html-util";
import { logWarn } from "@/utils/logger";
import {
    attachBacklinkPanelScrollCleanup,
} from "./backlink-panel-host.js";

export const BACKLINK_PANEL_DOCK_TYPE = "backlink-panel-dock";

/**
 * 默认 Dock 配置：将图标显示在侧栏右上角（RightTop），
 * 避免在右下角（RightBottom）时与右上角面板上下切分、共享右侧栏面板。
 */
export const DEFAULT_BACKLINK_DOCK_CONFIG = {
    position: "RightTop" as const,
    size: { width: 300, height: 0 },
    icon: CUSTOM_ICON_MAP.BacklinkPanelFilter.id,
    title: "反链管家 Dock",
    hotkey: "⌥⇧B",
    show: false,
};

export class DockService {

    public static get ins(): DockService {
        return Instance.get(DockService);
    }

    init() {
        addBacklinkPanelDock();

    }


}


function addBacklinkPanelDock() {
    if (!EnvConfig.ins || !EnvConfig.ins.plugin) {
        logWarn("添加反链面板 dock 失败。")
        return;
    }
    let dockDisplay = SettingService.ins.SettingConfig.dockDisplay;
    if (!dockDisplay) {
        return;
    }

    let plugin = EnvConfig.ins.plugin;
    let docSearchSvelet: BacklinkPanelDockSvelte;
    let detachScrollCleanup: () => void;
    let dockRet = plugin.addDock({
        config: {
            ...DEFAULT_BACKLINK_DOCK_CONFIG,
        },
        data: {},
        type: BACKLINK_PANEL_DOCK_TYPE,
        resize() {
            if (docSearchSvelet) {
                docSearchSvelet.resize(this.element.clientWidth);
            }
        },
        update() {
        },
        init() {
            this.element.innerHTML = "";
            docSearchSvelet = new BacklinkPanelDockSvelte({
                target: this.element,
                props: {
                }
            });
            detachScrollCleanup = attachBacklinkPanelScrollCleanup({
                element: this.element,
                onCleanup: () => clearProtyleGutters(this.element),
            });

            if (EnvConfig.ins.isMobile) {
                docSearchSvelet.resize(1);
            }
        },
        destroy() {
            detachScrollCleanup?.();
            docSearchSvelet.$destroy();
        }
    });
    // EnvConfig.ins.docSearchDock = dockRet;
}
