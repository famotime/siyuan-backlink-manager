import { CacheManager } from "@/config/CacheManager";
import { IPanelRenderFilterQueryParams, BacklinkPanelFilterCriteria } from "@/models/backlink-model";
import { getBlockAttrs, setBlockAttrs } from "@/utils/api";
import Instance from "@/utils/Instance";
import { SettingService } from "./SettingService";
import { mergeObjects } from "@/utils/object-util";
import { logError } from "@/utils/logger";

const BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY = "custom-backlink-filter-panel-last-criteria";
export const DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY = "custom-document-bottom-show-backlink-filter-panel";

export class BacklinkFilterPanelAttributeService {
    public static get ins(): BacklinkFilterPanelAttributeService {
        return Instance.get(BacklinkFilterPanelAttributeService);
    }

    public async getPanelCriteria(rootId: string): Promise<BacklinkPanelFilterCriteria> {
        let documentPanelCriteria = CacheManager.ins.getBacklinkFilterPanelLastCriteria(rootId);
        let defaultQueryParams = this.getDefaultQueryParams();
        let queryParams: IPanelRenderFilterQueryParams;

        if (documentPanelCriteria) {
            documentPanelCriteria.queryParams.pageNum = 1;
            queryParams = mergeObjects(documentPanelCriteria.queryParams, defaultQueryParams);
        } else {
            let attrsMap = await getBlockAttrs(rootId);
            if (attrsMap && Object.keys(attrsMap).includes(BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY)) {
                let json = attrsMap[BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY];
                // 块属性可能被用户手动改坏，解析失败时按无历史条件处理
                try {
                    let parseObject = JSON.parse(json) as BacklinkPanelFilterCriteria;
                    if ("queryParams" in parseObject) {
                        documentPanelCriteria = parseObject;
                        parseObject.queryParams.backlinkKeywordStr = "";
                        queryParams = mergeObjects(documentPanelCriteria.queryParams, defaultQueryParams);
                    }
                } catch (e) {
                    logError(`反链面板 解析历史筛选条件失败 rootId: ${rootId}`, e);
                }
            }
            if (!documentPanelCriteria) {
                queryParams = defaultQueryParams;
                documentPanelCriteria = new BacklinkPanelFilterCriteria();
            }
            queryParams.includeDocumentIds = new Set<string>();
            queryParams.excludeDocumentIds = new Set<string>();
            CacheManager.ins.setBacklinkFilterPanelLastCriteria(rootId, documentPanelCriteria);
        }

        documentPanelCriteria.queryParams = queryParams;
        return documentPanelCriteria;
    }

    public async updatePanelCriteria(rootId: string, criteria: BacklinkPanelFilterCriteria) {
        if (!rootId) {
            return;
        }
        // 持久化前剥离关键词，避免把临时筛选状态写进块属性
        const criteriaToPersist: BacklinkPanelFilterCriteria = JSON.parse(JSON.stringify(criteria));
        criteriaToPersist.queryParams.backlinkKeywordStr = "";

        let lastCriteria = await this.getPanelCriteria(rootId);
        if (JSON.stringify(criteriaToPersist) === JSON.stringify(lastCriteria)) {
            return;
        }

        CacheManager.ins.setBacklinkFilterPanelLastCriteria(rootId, criteria);

        let attrs: Record<string, string> = {};
        attrs[BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY] = JSON.stringify(criteriaToPersist);
        setBlockAttrs(rootId, attrs);
    }

    public async updateDocumentBottomShowPanel(rootId: string, value: number) {
        if (!rootId) {
            return;
        }
        let valueStr = value ? String(value) : "";
        let attrs: Record<string, string> = {};
        attrs[DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY] = valueStr;
        setBlockAttrs(rootId, attrs);
    }

    getDefaultQueryParams(): IPanelRenderFilterQueryParams {
        let settingConfig = SettingService.ins.SettingConfig;
        let backlinkBlockSortMethod = "modifiedDesc";
        let pageSize = 8;
        if (settingConfig) {
            backlinkBlockSortMethod = settingConfig.backlinkBlockSortMethod || backlinkBlockSortMethod;
            pageSize = settingConfig.pageSize || pageSize;
        }
        return {
            pageNum: 1,
            pageSize: pageSize,
            backlinkBlockSortMethod: backlinkBlockSortMethod as BlockSortMethod,
            backlinkKeywordStr: "",
            includeDocumentIds: new Set<string>(),
            excludeDocumentIds: new Set<string>(),
        } as IPanelRenderFilterQueryParams;
    }
}
