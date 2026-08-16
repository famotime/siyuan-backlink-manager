import { ItemProperty, TabProperty } from "./setting-model";

export function getSettingTabArray(): TabProperty[] {
    let tabProperties: TabProperty[] = [];

    tabProperties.push(
        new TabProperty({
            key: "backlink-panel-setting",
            name: "反链面板",
            iconKey: "iconLink",
            props: [
                new ItemProperty({
                    key: "showBacklinkProtyleBreadcrumb",
                    type: "switch",
                    name: "显示面包屑",
                    description: "在反链块上方显示层级面包屑导航，默认关闭。",
                    tips: "",
                }),
                new ItemProperty({
                    key: "showReferencedTargetBlock",
                    type: "switch",
                    name: "显示被引用目标块",
                    description: "在反链内容下方显示被引用的块或文档标题卡片，点击可快速跳转定位。",
                    tips: "",
                }),
                new ItemProperty({
                    key: "enableLogPrint",
                    type: "switch",
                    name: "日志打印",
                    description: "开启后在浏览器控制台输出调试日志，默认关闭。",
                    tips: "",
                }),
            ],
        })
    );

    return tabProperties;
}

