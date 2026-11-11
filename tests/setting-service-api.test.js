import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("SettingService exposes correctly spelled config update APIs", () => {
  const source = readFileSync(
    new URL("../src/service/setting/SettingService.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /public async updateSettingConfigValue\(key: string, newValue: any\)/);
  assert.match(source, /public async updateSettingConfig\(settingConfigParam: SettingConfig\)/);
  // 历史拼写错误的别名（updateSettingCofnigValue/updateSettingCofnig）已移除，防止其重新出现
  assert.doesNotMatch(source, /Cofnig/);
});

test("SettingService provides listener subscription APIs for config synchronization", () => {
  const source = readFileSync(
    new URL("../src/service/setting/SettingService.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /public addListener\(callback: \(config: SettingConfig/);
  assert.match(source, /public removeListener\(callback: \(config: SettingConfig/);
});

