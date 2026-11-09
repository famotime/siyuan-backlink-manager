import type { IPanelRednerFilterQueryParams } from "./backlink-model";

/**
 * 反链面板过滤条件持久化模型：查询参数 + 过滤视图展开状态。
 * 自 backlink-model.ts 迁出，模型文件仅保留 re-export 以维持旧导入路径。
 */
export class BacklinkPanelFilterCriteria {
    queryParams: IPanelRednerFilterQueryParams;
    backlinkPanelFilterViewExpand?: boolean;
}
