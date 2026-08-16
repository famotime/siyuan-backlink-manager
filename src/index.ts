import {
    Plugin,
} from "siyuan";
import "@/index.scss";


import { EnvConfig } from "./config/EnvConfig";
import { CUSTOM_ICON_MAP } from "./models/icon-constant";
import { SettingService, STORAGE_NAME } from "./service/setting/SettingService";
import { openSettingsDialog } from "./components/setting/setting-util";
import { DocumentService } from "./service/plugin/DocumentService";
import { DockService } from "./service/plugin/DockServices";
import { TopBarService } from "./service/plugin/TopBarService";
import { TabService } from "./service/plugin/TabService";
import { logError } from "./utils/logger";


export default class PluginSample extends Plugin {


    async onload() {
        EnvConfig.ins.init(this);
        await SettingService.ins.init()
        DockService.ins.init();
        TabService.ins.init();
        TopBarService.ins.init();
        DocumentService.ins.init();


        // 图标的制作参见帮助文档
        for (const key in CUSTOM_ICON_MAP) {
            if (Object.prototype.hasOwnProperty.call(CUSTOM_ICON_MAP, key)) {
                const item = CUSTOM_ICON_MAP[key];
                this.addIcons(item.source);
            }
        }

        this.eventBus.on('switch-protyle', (e: any) => {
            EnvConfig.ins.lastViewedDocId = e.detail.protyle.block.rootID;
        })
        this.eventBus.on('loaded-protyle-static', (e: any) => {
            if (EnvConfig.ins.isMobile && !EnvConfig.ins.lastViewedDocId) {
                EnvConfig.ins.lastViewedDocId = e.detail.protyle.block.rootID;
            }
        })
    }




    onLayoutReady() {

    }

    async onunload() {
        DocumentService.ins.destory();
    }

    async uninstall() {
        try {
            await this.removeData(STORAGE_NAME);
        } catch (e) {
            logError(`[${this.name}] Failed to remove plugin data on uninstall:`, e);
        }
    }


    openSetting(): void {
        openSettingsDialog();
    }


}
