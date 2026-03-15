import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSveltePath = new URL(
  "../src/components/panel/backlink-filter-panel-page.svelte",
  import.meta.url,
);
const settingConstantPath = new URL(
  "../src/models/setting-constant.ts",
  import.meta.url,
);

test("backlink panel only mounts filter controls when the setting enables them", () => {
  const pageSvelte = readFileSync(pageSveltePath, "utf8");

  assert.match(
    pageSvelte,
    /let showFilterPanel = SettingService\.ins\.SettingConfig\.enableFilterPanel;/,
    "page should derive filter-panel visibility from the plugin setting",
  );
  assert.match(
    pageSvelte,
    /\{#if showFilterPanel\}[\s\S]*<BacklinkFilterPanelControls/,
    "page should guard filter controls behind the enableFilterPanel switch",
  );
});

test("setting tab exposes an enable-filter-panel switch", () => {
  const settingConstant = readFileSync(settingConstantPath, "utf8");

  assert.match(
    settingConstant,
    /key:\s*"enableFilterPanel"[\s\S]*name:\s*"启用筛选面板"/,
    "settings should expose the filter-panel toggle",
  );
});
