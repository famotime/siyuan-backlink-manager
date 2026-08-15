import { EnvConfig } from "@/config/EnvConfig";

export function BACKLINK_BLOCK_SORT_METHOD_ELEMENT(): { name: string, value: BlockSortMethod }[] {
    return [
        {
            name: EnvConfig.ins.i18n.modifiedASC,
            value: "modifiedAsc",
        },
        {
            name: EnvConfig.ins.i18n.modifiedDESC,
            value: "modifiedDesc",
        },
        {
            name: EnvConfig.ins.i18n.createdASC,
            value: "createdAsc",
        },
        {
            name: EnvConfig.ins.i18n.createdDESC,
            value: "createdDesc",
        },
        {
            name: EnvConfig.ins.i18n.fileNameASC,
            value: "alphabeticAsc",
        },
        {
            name: EnvConfig.ins.i18n.fileNameDESC,
            value: "alphabeticDesc",
        },
        {
            name: "文档名称升序",
            value: "documentAlphabeticAsc",
        },
        {
            name: "文档名称降序",
            value: "documentAlphabeticDesc",
        },
    ];
}
