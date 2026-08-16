import { EnvConfig } from "@/config/EnvConfig";
import { SettingConfig } from "@/models/setting-model";
import { sql } from "@/utils/api";
import Instance from "@/utils/Instance";
import { getCreateBlocksParentIdIdxSql } from "../backlink/backlink-sql";
import { setReplacer } from "@/utils/json-util";
import {
    createDefaultSettingConfig,
    resolveSettingConfig,
    shouldPersistSettingConfig,
} from "./setting-config-resolver.js";
import { logError, logInfo } from "@/utils/logger";

export const STORAGE_NAME = 'backlink-panel-setting.json';
const SettingFileName = STORAGE_NAME;

export class SettingService {

    public static get ins(): SettingService {
        return Instance.get(SettingService);
    }

    private _settingConfig: SettingConfig = getDefaultSettingConfig();

    public get SettingConfig() {
        return this._settingConfig;
    }

    private _listeners: Set<(config: SettingConfig, key?: string, value?: any) => void> = new Set();

    public addListener(callback: (config: SettingConfig, key?: string, value?: any) => void) {
        this._listeners.add(callback);
        return () => {
            this._listeners.delete(callback);
        };
    }

    public removeListener(callback: (config: SettingConfig, key?: string, value?: any) => void) {
        this._listeners.delete(callback);
    }

    private notifyListeners(key?: string, value?: any) {
        for (const listener of this._listeners) {
            try {
                listener(this._settingConfig, key, value);
            } catch (e) {
                logError("Setting listener error:", e);
            }
        }
    }

    private syncDebugFlag() {
        if (typeof globalThis !== "undefined") {
            (globalThis as any).__BACKLINK_DEBUG__ = this._settingConfig.enableLogPrint === true;
        }
    }

    public async init() {
        let persistentConfig = await getPersistentConfig();
        this._settingConfig = getResolvedSettingConfig(persistentConfig);
        this.syncDebugFlag();

        if (this._settingConfig.usePraentIdIdx) {
            this.createBlocksParentIdIdx();
        }
        this.notifyListeners();
    }

    // public async getSettingConfig(): Promise<SettingConfig> {
    //     if (!this.settingConfig) {
    //         await this.init();
    //     }
    //     if (this.settingConfig) {
    //         return this.settingConfig;
    //     }
    //     let defaultSettingConfig = getDefaultSettingConfig();
    //     logError(`反链面板 异常，返回默认设置: `, defaultSettingConfig);
    //     return defaultSettingConfig;
    // }

    public async updateSettingConfigValue(key: string, newValue: any) {
        let oldValue = this._settingConfig[key];
        if (oldValue == newValue) {
            return;
        }

        this._settingConfig[key] = newValue;
        this.syncDebugFlag();
        let paramJson = JSON.stringify(this._settingConfig, setReplacer);
        let plugin = EnvConfig.ins.plugin;
        if (plugin) {
            logInfo(`反链面板 更新设置配置文件: ${paramJson}`);
            plugin.saveData(SettingFileName, paramJson);
        }
        this.notifyListeners(key, newValue);
    }

    public async updateSettingCofnigValue(key: string, newValue: any) {
        return this.updateSettingConfigValue(key, newValue);
    }

    public async updateSettingConfig(settingConfigParam: SettingConfig) {
        let plugin = EnvConfig.ins.plugin;
        if (!shouldPersistSettingConfig(this._settingConfig, settingConfigParam)) {
            return;
        }
        let paramJson = JSON.stringify(settingConfigParam, setReplacer);
        this._settingConfig = getResolvedSettingConfig(settingConfigParam);
        this.syncDebugFlag();
        logInfo(`反链面板 更新设置配置文件: ${paramJson}`);
        if (plugin) {
            plugin.saveData(SettingFileName, paramJson);
        }
        this.notifyListeners();
    }

    public async updateSettingCofnig(settingConfigParam: SettingConfig) {
        return this.updateSettingConfig(settingConfigParam);
    }

    public async createBlocksParentIdIdx() {
        let createdSql = getCreateBlocksParentIdIdxSql();
        sql(createdSql);
    }

}



async function getPersistentConfig(): Promise<SettingConfig> {
    let plugin = EnvConfig.ins.plugin;
    let settingConfig = null;
    if (!plugin) {
        return settingConfig;
    }
    let loaded = await plugin.loadData(SettingFileName);
    if (loaded == null || loaded == undefined || loaded == '') {
        logInfo(`反链面板插件 没有配置文件，使用默认配置`);
    } else {
        if (typeof loaded === 'string') {
            try {
                loaded = JSON.parse(loaded);
            } catch (e) {
                logError(`Setting json parse error:`, e);
            }
        }
        if (loaded && typeof loaded === 'object') {
            try {
                settingConfig = new SettingConfig();
                for (let key in loaded) {
                    setKeyValue(settingConfig, key, loaded[key]);
                }
            } catch (error_msg) {
                logError(`Setting load error: ${error_msg}`);
            }
        }
    }
    return settingConfig;
}

function setKeyValue(settingConfig: any, key: any, value: any) {
    if (!(key in settingConfig)) {
        return;
    }
    settingConfig[key] = value;
}

function getDefaultSettingConfig() {
    return getResolvedSettingConfig();
}

function getResolvedSettingConfig(settingConfig: Partial<SettingConfig> = null): SettingConfig {
    return Object.assign(
        new SettingConfig(),
        resolveSettingConfig(settingConfig),
    );
}
