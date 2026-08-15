import { CacheManager } from "@/config/CacheManager";
import { IPanelRednerFilterQueryParams, BacklinkPanelFilterCriteria } from "@/models/backlink-model";
import { getBlockAttrs, setBlockAttrs } from "@/utils/api";
import Instance from "@/utils/Instance";
import { SettingService } from "./SettingService";
import { setReplacer, setReviver } from "@/utils/json-util";
import { mergeObjects } from "@/utils/object-util";

const BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY = "custom-backlink-filter-panel-last-criteria";
const BACKLINK_FILTER_PANEL_SAVED_CRITERIA_ATTRIBUTE_KEY = "custom-backlink-filter-panel-saved-criteria";
export const DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY = "custom-document-bottom-show-backlink-filter-panel";

export class BacklinkFilterPanelAttributeService {
    public static get ins(): BacklinkFilterPanelAttributeService {
        return Instance.get(BacklinkFilterPanelAttributeService);
    }

    public async getPanelCriteria(rootId: string): Promise<BacklinkPanelFilterCriteria> {
        let documentPanelCriteria = CacheManager.ins.getBacklinkFilterPanelLastCriteria(rootId);
        let defaultQueryParams = this.getDefaultQueryParams();
        let queryParams: IPanelRednerFilterQueryParams;

        if (documentPanelCriteria) {
            documentPanelCriteria.queryParams.pageNum = 1;
            queryParams = mergeObjects(documentPanelCriteria.queryParams, defaultQueryParams);
        } else {
            let attrsMap = await getBlockAttrs(rootId);
            if (attrsMap && Object.keys(attrsMap).includes(BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY)) {
                let json = attrsMap[BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY];
                let parseObject = JSON.parse(json) as BacklinkPanelFilterCriteria;
                if ("queryParams" in parseObject) {
                    documentPanelCriteria = parseObject;
                    parseObject.queryParams.backlinkKeywordStr = "";
                    queryParams = mergeObjects(documentPanelCriteria.queryParams, defaultQueryParams);
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
        let lastCriteria = await this.getPanelCriteria(rootId);
        let lastCriteriaJson = "";
        if (lastCriteria) {
            lastCriteriaJson = JSON.stringify(lastCriteria);
        }
        let criteriaJson = JSON.stringify(criteria);
        if (criteriaJson == lastCriteriaJson) {
            return;
        }

        CacheManager.ins.setBacklinkFilterPanelLastCriteria(rootId, criteria);

        let criteriaCloned: BacklinkPanelFilterCriteria = JSON.parse(criteriaJson);
        criteriaCloned.queryParams.backlinkKeywordStr = "";
        let criteriaClonedJson = JSON.stringify(criteriaCloned);
        let attrs: Record<string, string> = {};
        attrs[BACKLINK_FILTER_PANEL_LAST_CRITERIA_ATTRIBUTE_KEY] = criteriaClonedJson;
        setBlockAttrs(rootId, attrs);
    }

    public async getPanelSavedCriteriaMap(rootId: string): Promise<Map<string, IPanelRednerFilterQueryParams>> {
        let savedCriteriaMap = CacheManager.ins.getBacklinkPanelSavedCriteria(rootId);
        if (savedCriteriaMap && savedCriteriaMap.size > 0) {
            return savedCriteriaMap;
        }

        let attrsMap = await getBlockAttrs(rootId);
        if (attrsMap && Object.keys(attrsMap).includes(BACKLINK_FILTER_PANEL_SAVED_CRITERIA_ATTRIBUTE_KEY)) {
            let json = attrsMap[BACKLINK_FILTER_PANEL_SAVED_CRITERIA_ATTRIBUTE_KEY];
            let parseObject = JSON.parse(json, setReviver);
            if (parseObject) {
                const resultMap = new Map<string, IPanelRednerFilterQueryParams>(Object.entries(parseObject));
                CacheManager.ins.setBacklinkPanelSavedCriteria(rootId, resultMap);
                return resultMap;
            }
        }

        return new Map();
    }

    public async updatePanelSavedCriteriaMap(rootId: string, criteriaMap: Map<string, IPanelRednerFilterQueryParams>) {
        if (!rootId) {
            return;
        }
        const mapObject = Object.fromEntries(criteriaMap);
        let criteriaJson = JSON.stringify(mapObject, setReplacer);
        CacheManager.ins.setBacklinkPanelSavedCriteria(rootId, criteriaMap);

        let attrs: Record<string, string> = {};
        attrs[BACKLINK_FILTER_PANEL_SAVED_CRITERIA_ATTRIBUTE_KEY] = criteriaJson;
        setBlockAttrs(rootId, attrs);
    }

    public async getDocumentBottomShowPanel(rootId: string): Promise<number> {
        let attrsMap = await getBlockAttrs(rootId);
        if (attrsMap && Object.keys(attrsMap).includes(DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY)) {
            let json = attrsMap[DOCUMENT_BOTTOM_SHOW_BACKLINK_FILTER_PANEL_ATTRIBUTE_KEY];
            return Number(json);
        }
        return null;
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

    getDefaultQueryParams(): IPanelRednerFilterQueryParams {
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
        } as IPanelRednerFilterQueryParams;
    }
}
