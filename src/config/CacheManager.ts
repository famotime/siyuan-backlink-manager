import { BacklinkPanelFilterCriteria, IBacklinkFilterPanelData } from "@/models/backlink-model";
import { CacheUtil, generateKey } from "@/utils/cache-util";
import Instance from "@/utils/Instance";


// 注意：DESTROY_BACKLINK_TAB_CACHE_KEY 仅作为内存缓存 key（不落盘），拼写可安全修正
const DESTROY_BACKLINK_TAB_CACHE_KEY = "DESTROY_BACKLINK_TAB_CACHE_KEY"

export class CacheManager {


    public static get ins(): CacheManager {
        return Instance.get(CacheManager);
    }

    private backlinkPanelBaseDataCache: CacheUtil = new CacheUtil();
    private backlinkDocApiDataCache: CacheUtil = new CacheUtil();
    private backlinkFilterPanelLastCriteriaCache: CacheUtil = new CacheUtil();
    // 独立页签销毁记录缓存：服务于 issue #23 的「新窗口打开页签恢复」休眠方案（读取端在 TabService 中暂时注释）
    private backlinkDestroyTabDocIdCache: CacheUtil = new CacheUtil();

    // 毫秒
    private dayTtl: number = 24 * 60 * 60 * 1000;



    public setBacklinkPanelBaseData(rootId: string, value: IBacklinkFilterPanelData, ttlSeconds: number) {
        this.backlinkPanelBaseDataCache.set(rootId, value, ttlSeconds * 1000);
    }
    public getBacklinkPanelBaseData(rootId: string): IBacklinkFilterPanelData {
        return this.backlinkPanelBaseDataCache.get(rootId);
    }
    public deleteBacklinkPanelBaseData(rootId: string) {
        this.backlinkPanelBaseDataCache.delete(rootId);
    }

    // 注意：set/get 必须使用同一结构的 key（defId:refTreeId:keyword），
    // 否则缓存只写不中；deleteBacklinkDocApiData 依赖 key 以 defId 开头做前缀清理
    public setBacklinkDocApiData(defId: string, refTreeId: string, keyword: string, value: any, ttlSeconds: number) {
        let key = generateKey(defId, refTreeId, keyword);
        this.backlinkDocApiDataCache.set(key, value, ttlSeconds * 1000);
    }
    public getBacklinkDocApiData(defId: string, refTreeId: string, keyword: string): any {
        let key = generateKey(defId, refTreeId, keyword);
        return this.backlinkDocApiDataCache.get(key);
    }
    public deleteBacklinkDocApiData(defId: string,) {
        this.backlinkDocApiDataCache.clearByPrefix(defId);
    }

    public deleteBacklinkPanelAllCache(rootId: string) {
        this.deleteBacklinkPanelBaseData(rootId);
        this.deleteBacklinkDocApiData(rootId);
    }


    public setBacklinkFilterPanelLastCriteria(rootId: string, value: BacklinkPanelFilterCriteria) {
        this.backlinkFilterPanelLastCriteriaCache.set(rootId, value, this.dayTtl);
    }
    public getBacklinkFilterPanelLastCriteria(rootId: string): BacklinkPanelFilterCriteria {
        return this.backlinkFilterPanelLastCriteriaCache.get(rootId);
    }

    public addBacklinkDestroyTabDocId(docId: string) {
        this.backlinkDestroyTabDocIdCache.setByPrefix(DESTROY_BACKLINK_TAB_CACHE_KEY, docId, docId, 2 * 3600 * 1000);
    }

    public getAndRemoveBacklinkDestroyTabDocIdArray(): string[] {
        return this.backlinkDestroyTabDocIdCache.popByPrefix(DESTROY_BACKLINK_TAB_CACHE_KEY);
    }
}