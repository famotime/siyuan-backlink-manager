import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultSettingConfig,
  resolveSettingConfig,
  shouldPersistSettingConfig,
} from "../src/service/setting/setting-config-resolver.js";

test("resolveSettingConfig merges persistent values over defaults", () => {
  const resolved = resolveSettingConfig({
    pageSize: 12,
    dockDisplay: false,
    backlinkContextMaxVisibleChars: 320,
  });

  assert.equal(resolved.pageSize, 12);
  assert.equal(resolved.dockDisplay, false);
  assert.equal(resolved.documentBottomDisplay, false);
  assert.equal(resolved.backlinkContextPreset, "balanced");
  assert.equal(resolved.backlinkContextMaxVisibleChars, 320);
});

test("shouldPersistSettingConfig only persists changed config payloads", () => {
  const current = createDefaultSettingConfig();
  const same = { ...current };
  const changed = { ...current, pageSize: current.pageSize + 1 };

  assert.equal(shouldPersistSettingConfig(current, same), false);
  assert.equal(shouldPersistSettingConfig(current, changed), true);
});

test("createDefaultSettingConfig includes backlink context budget defaults", () => {
  const current = createDefaultSettingConfig();

  assert.equal(current.backlinkContextPreset, "balanced");
  assert.equal(current.backlinkContextMaxVisibleFragments, 6);
  assert.equal(current.backlinkContextMaxVisibleChars, 240);
  assert.equal(current.backlinkContextMaxDepth, 3);
  assert.equal(current.backlinkContextMaxExpandedNodes, 12);
});

test("createDefaultSettingConfig disables the filter panel by default", () => {
  const current = createDefaultSettingConfig();
  const enabled = resolveSettingConfig({ enableFilterPanel: true });

  assert.equal(current.enableFilterPanel, false);
  assert.equal(enabled.enableFilterPanel, true);
});

test("resolveSettingConfig derives compact preset from legacy context switches", () => {
  const resolved = resolveSettingConfig({
    queryParentDefBlock: false,
    querrChildDefBlockForListItem: false,
    queryChildDefBlockForHeadline: false,
  });

  assert.equal(resolved.backlinkContextPreset, "compact");
  assert.equal(resolved.queryParentDefBlock, false);
  assert.equal(resolved.querrChildDefBlockForListItem, false);
  assert.equal(resolved.queryChildDefBlockForHeadline, false);
});

test("resolveSettingConfig derives expanded preset from legacy headline expansion config", () => {
  const resolved = resolveSettingConfig({
    queryParentDefBlock: true,
    querrChildDefBlockForListItem: true,
    queryChildDefBlockForHeadline: true,
  });

  assert.equal(resolved.backlinkContextPreset, "expanded");
});

test("resolveSettingConfig applies explicit preset defaults but preserves advanced overrides", () => {
  const resolved = resolveSettingConfig({
    backlinkContextPreset: "compact",
    backlinkContextMaxVisibleChars: 500,
    queryParentDefBlock: true,
  });

  assert.equal(resolved.backlinkContextPreset, "compact");
  assert.equal(resolved.backlinkContextMaxVisibleFragments, 4);
  assert.equal(resolved.backlinkContextMaxVisibleChars, 500);
  assert.equal(resolved.queryParentDefBlock, true);
});
