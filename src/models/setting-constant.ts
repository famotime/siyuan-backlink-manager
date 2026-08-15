import { BACKLINK_BLOCK_SORT_METHOD_ELEMENT } from "./backlink-constant";
import { ItemProperty, IOption, TabProperty } from "./setting-model";

export function getSettingTabArray(): TabProperty[] {
    let tabProperties: TabProperty[] = [];

    tabProperties.push(
        new TabProperty({
            key: "plugin-setting",
            name: "插件设置",
            iconKey: "iconPlugin",
            props: [
                new ItemProperty({ key: "dockDisplay", type: "switch", name: "显示反链面板 Dock", description: "", tips: "" }),
                new ItemProperty({ key: "documentBottomDisplay", type: "switch", name: "文档底部显示反链面板", description: "", tips: "" }),
                new ItemProperty({ key: "flashCardBottomDisplay", type: "switch", name: "闪卡底部显示反链面板", description: "", tips: "" }),
                new ItemProperty({ key: "cacheAfterResponseMs", type: "number", name: "启用缓存门槛（毫秒）", description: "当接口响应时间超过这个数，就会把这次查询结果存入缓存，-1 不开启缓存", tips: "", min: -1 }),
                new ItemProperty({ key: "cacheExpirationTime", type: "number", name: "缓存过期时间（秒）", description: "", tips: "缓存数据失效时间", min: -1 }),
                new ItemProperty({ key: "doubleClickTimeout", type: "number", name: "双击时间阈值(毫秒)", description: "", tips: "", min: 0 }),
                new ItemProperty({ key: "documentBottomBacklinkPaddingWidth", type: "number", name: "文档底部反链面板左右间距", description: "为空则跟文档宽度一致。", tips: "" }),
            ]
        }),
        new TabProperty({
            key: "backlink-panel-setting",
            name: "反链面板",
            iconKey: "iconLink",
            props: [
                new ItemProperty({ key: "docBottomBacklinkPanelViewExpand", type: "switch", name: "文档底部默认展开反链面板", description: "", tips: "" }),
                new ItemProperty({ key: "pageSize", type: "number", name: "每页反链块数量", description: "每页反链块显示的数量", tips: "", min: 1, max: 50 }),
                new ItemProperty({ key: "backlinkBlockSortMethod", type: "select", name: "反链块排序方式", description: "", tips: "", options: getBacklinkBlockSortMethodOptions() }),
                new ItemProperty({ key: "backlinkContextPreset", type: "select", name: "上下文策略预设", description: "用更易理解的预设统一控制默认上下文范围。", tips: "", options: getBacklinkContextPresetOptions() }),
                new ItemProperty({ key: "defaultExpandedListItemLevel", type: "number", name: "默认展开列表项层数", description: "如果反链所在是列表项，默认展开的子列表深度。", tips: "", min: 0, max: 10 }),
                new ItemProperty({ key: "hideBacklinkProtyleBreadcrumb", type: "switch", name: "隐藏面包屑", description: "", tips: "" }),
            ]
        })
    );

    return tabProperties;
}

function getBacklinkContextPresetOptions(): IOption[] {
    return [
        { value: "compact", name: "紧凑", desc: "核心层优先" },
        { value: "balanced", name: "平衡", desc: "核心 + 近邻" },
        { value: "expanded", name: "扩展", desc: "核心 + 近邻 + 扩展" },
    ];
}

function getBacklinkBlockSortMethodOptions(): IOption[] {
    let backlinkBlockSortMethodElements = BACKLINK_BLOCK_SORT_METHOD_ELEMENT();
    let options: IOption[] = [];
    for (const element of backlinkBlockSortMethodElements) {
        options.push(element);
    }
    return options;
}
