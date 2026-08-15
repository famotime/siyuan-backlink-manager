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
                    key: "hideBacklinkProtyleBreadcrumb",
                    type: "switch",
                    name: "隐藏面包屑",
                    description: "隐藏反链块上方的思源路径面包屑导航，让侧栏显示更加紧凑。",
                    tips: "",
                }),
            ],
        })
    );

    return tabProperties;
}

