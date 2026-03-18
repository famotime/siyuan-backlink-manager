import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveBacklinkPanelRefreshRootId } from "../src/components/panel/backlink-panel-refresh.js";

test("backlink panel controller forwards contextVisibilityLevel into protyle post-processing", () => {
  const source = fs.readFileSync(
    new URL("../src/components/panel/backlink-panel-controller-composition.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /applyCreatedBacklinkProtyleState:\s*\(\{\s*[\s\S]*?contextVisibilityLevel[\s\S]*?\}\)\s*=>[\s\S]*?applyCreatedBacklinkProtyleState\(\{[\s\S]*?contextVisibilityLevel,[\s\S]*?showFullDocument,/,
  );
});

test("resolveBacklinkPanelRefreshRootId prefers the current main-area document tab", () => {
  const result = resolveBacklinkPanelRefreshRootId({
    currentTab: { id: "backlink-tab" },
    fallbackRootId: "doc-panel",
    fallbackLastViewedDocId: "doc-last-viewed",
    deps: {
      getActiveBacklinkDocumentMainAreaTabElement: () => ({
        getAttribute(name) {
          return name === "data-id" ? "tab-main-doc" : null;
        },
      }),
      queryDocumentRootIdByTabDataId: (tabDataId) =>
        tabDataId === "tab-main-doc" ? "doc-main" : "",
    },
  });

  assert.equal(result, "doc-main");
});

test("resolveBacklinkPanelRefreshRootId falls back to the last viewed document when the main-area tab cannot be resolved", () => {
  const result = resolveBacklinkPanelRefreshRootId({
    currentTab: { id: "backlink-tab" },
    fallbackRootId: "doc-panel",
    fallbackLastViewedDocId: "doc-last-viewed",
    deps: {
      getActiveBacklinkDocumentMainAreaTabElement: () => null,
      queryDocumentRootIdByTabDataId: () => "",
    },
  });

  assert.equal(result, "doc-last-viewed");
});

test("resolveBacklinkPanelRefreshRootId falls back to the current panel root when no other document context exists", () => {
  const result = resolveBacklinkPanelRefreshRootId({
    currentTab: { id: "backlink-tab" },
    fallbackRootId: "doc-panel",
    fallbackLastViewedDocId: "",
    deps: {
      getActiveBacklinkDocumentMainAreaTabElement: () => null,
      queryDocumentRootIdByTabDataId: () => "",
    },
  });

  assert.equal(result, "doc-panel");
});

test("backlink results panel exposes a refresh button wired to the refresh handler", () => {
  const source = fs.readFileSync(
    new URL("../src/components/panel/backlink-results-panel.svelte", import.meta.url),
    "utf8",
  );

  assert.match(source, /export let refreshBacklinkPanelToCurrentMainDocument;/);
  assert.match(source, /aria-label="刷新反链"/);
  assert.match(source, /on:click\|stopPropagation=\{refreshBacklinkPanelToCurrentMainDocument\}/);
});
