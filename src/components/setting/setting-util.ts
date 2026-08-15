import { EnvConfig } from "@/config/EnvConfig";
import { Dialog } from "siyuan";
import SettingPageSvelte from "@/components/setting/setting-page.svelte"




export function openSettingsDialog() {
    let isMobile = EnvConfig.ins.isMobile;
    // 生成Dialog内容
    const dialogId = "backlink-panel-setting-" + Date.now();
    // 创建dialog
    const settingDialog = new Dialog({
        title: "反链管家设置",
        content: `
          <div id="${dialogId}" style="overflow: hidden; position: relative; height: 100%;"></div>
          `,
        width: isMobile ? "92vw" : "680px",
        height: isMobile ? "50vw" : "380px",
    });

    new SettingPageSvelte({
        target: settingDialog.element.querySelector(`#${dialogId}`),
    });


}