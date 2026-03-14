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

  assert.equal(current.backlinkContextMaxVisibleFragments, 6);
  assert.equal(current.backlinkContextMaxVisibleChars, 240);
  assert.equal(current.backlinkContextMaxDepth, 3);
  assert.equal(current.backlinkContextMaxExpandedNodes, 12);
});
