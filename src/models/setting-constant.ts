import { EnvConfig } from "@/config/EnvConfig";
import { ItemProperty, TabProperty } from "./setting-model";

// 设置页文案走 i18n（zh/en），i18n 未加载时回退中文
export function getSettingTabArray(): TabProperty[] {
    const i18n = EnvConfig.ins.i18n || {};
    let tabProperties: TabProperty[] = [];

    tabProperties.push(
        new TabProperty({
            key: "backlink-panel-setting",
            name: i18n.tabNameBacklinkPanel || "反链面板",
            iconKey: "iconLink",
            props: [
                new ItemProperty({
                    key: "showBacklinkProtyleBreadcrumb",
                    type: "switch",
                    name: i18n.settingShowBreadcrumb || "显示面包屑",
                    description: i18n.settingShowBreadcrumbDesc || "在反链块上方显示层级面包屑导航，默认关闭。",
                    tips: "",
                }),
                new ItemProperty({
                    key: "showReferencedTargetBlock",
                    type: "switch",
                    name: i18n.settingShowTargetBlock || "显示被引用目标块",
                    description: i18n.settingShowTargetBlockDesc || "在反链内容下方显示被引用的块或文档标题卡片，点击可快速跳转定位，默认关闭。",
                    tips: "",
                }),
                new ItemProperty({
                    key: "enableLogPrint",
                    type: "switch",
                    name: i18n.settingEnableLog || "日志打印",
                    description: i18n.settingEnableLogDesc || "开启后在浏览器控制台输出调试日志，默认关闭。",
                    tips: "",
                }),
            ],
        })
    );

    return tabProperties;
}

