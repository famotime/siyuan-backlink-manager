import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("SettingService exposes correctly spelled config update APIs alongside legacy aliases", () => {
  const source = readFileSync(
    new URL("../src/service/setting/SettingService.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /public async updateSettingConfigValue\(key: string, newValue: any\)/);
  assert.match(source, /public async updateSettingConfig\(settingConfigParam: SettingConfig\)/);
  assert.match(source, /public async updateSettingCofnigValue\(key: string, newValue: any\)/);
  assert.match(source, /public async updateSettingCofnig\(settingConfigParam: SettingConfig\)/);
});

test("SettingService legacy typoed APIs delegate to the correctly spelled methods", () => {
  const source = readFileSync(
    new URL("../src/service/setting/SettingService.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /public async updateSettingCofnigValue\(key: string, newValue: any\)\s*\{\s*return this\.updateSettingConfigValue\(key, newValue\);/);
  assert.match(source, /public async updateSettingCofnig\(settingConfigParam: SettingConfig\)\s*\{\s*return this\.updateSettingConfig\(settingConfigParam\);/);
});
