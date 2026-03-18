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

const SettingFileName = 'backlink-panel-setting.json';

export class SettingService {

    public static get ins(): SettingService {
        return Instance.get(SettingService);
    }

    private _settingConfig: SettingConfig = getDefaultSettingConfig();

    public get SettingConfig() {
        return this._settingConfig;
    }

    public async init() {
        let persistentConfig = await getPersistentConfig();
        this._settingConfig = getResolvedSettingConfig(persistentConfig);
        // console.log("init this._settingConfig ", this._settingConfig)

        if (this._settingConfig.usePraentIdIdx) {
            this.createBlocksParentIdIdx();
        }
    }

    // public async getSettingConfig(): Promise<SettingConfig> {
    //     if (!this.settingConfig) {
    //         await this.init();
    //     }
    //     if (this.settingConfig) {
    //         return this.settingConfig;
    //     }
    //     let defaultSettingConfig = getDefaultSettingConfig();
    //     console.error(`反链面板 异常，返回默认设置: `, defaultSettingConfig);
    //     return defaultSettingConfig;
    // }

    public async updateSettingConfigValue(key: string, newValue: any) {
        let oldValue = this._settingConfig[key];
        if (oldValue == newValue) {
            return;
        }

        this._settingConfig[key] = newValue;
        let paramJson = JSON.stringify(this._settingConfig, setReplacer);
        let plugin = EnvConfig.ins.plugin;
        if (!plugin) {
            return;
        }
        console.log(`反链面板 更新设置配置文件: ${paramJson}`);
        plugin.saveData(SettingFileName, paramJson);
    }

    public async updateSettingCofnigValue(key: string, newValue: any) {
        return this.updateSettingConfigValue(key, newValue);
    }

    public async updateSettingConfig(settingConfigParam: SettingConfig) {
        let plugin = EnvConfig.ins.plugin;
        if (!plugin) {
            return;
        }

        if (!shouldPersistSettingConfig(this._settingConfig, settingConfigParam)) {
            return;
        }
        let paramJson = JSON.stringify(settingConfigParam, setReplacer);
        console.log(`反链面板 更新设置配置文件: ${paramJson}`);
        this._settingConfig = getResolvedSettingConfig(settingConfigParam);
        plugin.saveData(SettingFileName, paramJson);
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
        console.info(`反链面板插件 没有配置文件，使用默认配置`)
    } else {
        //如果有配置文件，则使用配置文件
        // console.info(`读入配置文件: ${SettingFileName}`)
        if (typeof loaded === 'string') {
            loaded = JSON.parse(loaded);
        }
        try {
            settingConfig = new SettingConfig();
            for (let key in loaded) {
                setKeyValue(settingConfig, key, loaded[key]);
            }
        } catch (error_msg) {
            console.log(`Setting load error: ${error_msg}`);
        }
    }
    return settingConfig;
}

function setKeyValue(settingConfig, key: any, value: any) {
    if (!(key in settingConfig)) {
        console.error(`"${key}" is not a setting`);
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
