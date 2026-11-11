/**
 * 思源笔记内核 API 封装（仅保留本项目实际使用的端点）。
 *
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 文档见 [API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */

import { fetchSyncPost, IWebSocketData } from "siyuan";
import { isBoolean } from "./object-util";
import { logError } from "./logger";



async function request(url: string, data: any) {
    let response: IWebSocketData = await fetchSyncPost(url, data);
    let res = response.code === 0 ? response.data : null;
    if (response.code != 0) {
        logError(`反链面板插件接口异常 url : ${url} , msg : ${response.msg}`)
    }
    return res;
}


// **************************************** Block ****************************************

export async function getBlockKramdown(id: BlockId): Promise<IResGetBlockKramdown> {
    let data = {
        id: id
    }
    let url = '/api/block/getBlockKramdown';
    return request(url, data);
}


export async function getChildBlocks(id: BlockId): Promise<IResGetChildBlock[]> {
    let data = {
        id: id
    }
    let url = '/api/block/getChildBlocks';
    return request(url, data);
}

export async function getBlockIndex(id: BlockId): Promise<number> {
    let data = {
        id: id
    }
    let url = '/api/block/getBlockIndex';

    return request(url, data);
}

export async function getBlocksIndexes(ids: BlockId[]): Promise<Object> {
    let data = {
        ids: ids
    }
    let url = '/api/block/getBlocksIndexes';

    return request(url, data);
}

export async function getBlockIsFolded(id: string): Promise<boolean> {

    let response = await checkBlockFold(id);
    let result: boolean;
    if (isBoolean(response)) {
        result = response as boolean;
    } else {
        result = response.isFolded;
    }
    return result;
};

export async function checkBlockFold(id: string): Promise<any> {
    if (!id) {
        // 参数校验失败，返回拒绝
        return Promise.reject(new Error('参数错误'));
    }
    let data = {
        id: id
    }
    let url = '/api/block/checkBlockFold';

    return request(url, data);
};


export async function getBatchBlockIdIndex(ids: string[]): Promise<Map<BlockId, number>> {
    let idMap: Map<string, number> = new Map();
    let getSuccess = true;
    try {
        let idObject = await getBlocksIndexes(ids);
        // 遍历对象的键值对，并将它们添加到 Map 中
        for (const key in idObject) {
            if (Object.prototype.hasOwnProperty.call(idObject, key)) {
                const value = idObject[key];
                idMap.set(key, value);
            }
        }
    } catch (err) {
        getSuccess = false;
        logError("批量获取块索引报错，可能是旧版本不支持批量接口 : ", err)
    }

    if (!getSuccess) {
        for (const id of ids) {
            let index = 0
            try {
                index = await getBlockIndex(id);
            } catch (err) {
                logError("获取块索引报错 : ", err)
            }
            idMap.set(id, index)
        }
    }

    return idMap;
}

// **************************************** Attributes ****************************************
export async function setBlockAttrs(id: BlockId, attrs: { [key: string]: string }) {
    let data = {
        id: id,
        attrs: attrs
    }
    let url = '/api/attr/setBlockAttrs';
    return request(url, data);
}


export async function getBlockAttrs(id: BlockId): Promise<{ [key: string]: string }> {
    let data = {
        id: id
    }
    let url = '/api/attr/getBlockAttrs';
    return request(url, data);
}

// **************************************** SQL ****************************************

export async function sql(sql: string): Promise<any[]> {
    let sqldata = {
        stmt: sql,
    };
    let url = '/api/query/sql';
    return request(url, sqldata);
}

// **************************************** Ref ****************************************

export async function getBacklinkDoc(defID: string, refTreeID: string, keyword: string, containChildren: boolean): Promise<{ backlinks: IBacklinkData[] }> {
    let data = {
        defID: defID,
        refTreeID: refTreeID,
        keyword: keyword,
        containChildren: containChildren,
    }
    let url = '/api/ref/getBacklinkDoc';

    return request(url, data);
}

/**
 *
{
  "sort": "3",
  "mSort": "3",
  "k": "",
  "mk": "",
  "id": "20240808122601-yuhti2c"
}
 * @param id 文档ID，聚焦就是聚焦后的ID
 * @param k  反链关键字
 * @param mk 提及关键字
 * @param sort 反链排序
 * @param msort 提及排序
 * @returns
 */
export async function getBacklink2(id: string, k: string, mk: string, sort: string, msort: string): Promise<any> {
    let data = {
        id: id,
        k: k,
        mk: mk,
        sort: sort,
        msort: msort,
    }
    let url = '/api/ref/getBacklink2';

    return request(url, data);
}
