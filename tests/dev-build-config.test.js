import test from "node:test";
import assert from "node:assert/strict";

import { resolveBuildDirectories } from "../scripts/dev-build-config.js";

test("uses workspace plugin directory during watch mode when VITE_DEV_DIST_DIR is empty", () => {
  const result = resolveBuildDirectories({
    isWatch: true,
    env: {
      VITE_SIYUAN_WORKSPACE_PATH: "D:/siyuan-plugin-test",
      VITE_DEV_DIST_DIR: "",
    },
    pluginName: "siyuan-backlink-manager",
  });

  assert.equal(result.distDir, "D:/siyuan-plugin-test/data/plugins/siyuan-backlink-manager");
  assert.equal(result.livereloadDir, "D:/siyuan-plugin-test/data/plugins/siyuan-backlink-manager");
});

test("uses explicit VITE_DEV_DIST_DIR during watch mode when provided", () => {
  const result = resolveBuildDirectories({
    isWatch: true,
    env: {
      VITE_SIYUAN_WORKSPACE_PATH: "D:/siyuan-plugin-test",
      VITE_DEV_DIST_DIR: "D:/custom/dev-dist",
    },
    pluginName: "siyuan-backlink-manager",
  });

  assert.equal(result.distDir, "D:/custom/dev-dist");
  assert.equal(result.livereloadDir, "D:/custom/dev-dist");
});

test("uses dist directory outside watch mode", () => {
  const result = resolveBuildDirectories({
    isWatch: false,
    env: {
      VITE_SIYUAN_WORKSPACE_PATH: "D:/siyuan-plugin-test",
      VITE_DEV_DIST_DIR: "D:/custom/dev-dist",
    },
    pluginName: "siyuan-backlink-manager",
  });

  assert.equal(result.distDir, "dist");
  assert.equal(result.livereloadDir, "dev");
});
