import test from "node:test";
import assert from "node:assert/strict";

import {
  attachBacklinkPanelScrollCleanup,
  buildBacklinkPanelPageProps,
  destroyBacklinkPanelHost,
  getBacklinkPanelPageFocusBlockId,
  updateBacklinkPanelPageProps,
} from "../src/service/plugin/backlink-panel-host.js";

test("buildBacklinkPanelPageProps preserves panel mount inputs", () => {
  assert.deepEqual(
    buildBacklinkPanelPageProps({
      rootId: "doc-1",
      focusBlockId: "block-1",
      currentTab: { id: "tab-1" },
      panelBacklinkViewExpand: true,
    }),
    {
      rootId: "doc-1",
      focusBlockId: "block-1",
      currentTab: { id: "tab-1" },
      panelBacklinkViewExpand: true,
    },
  );
});

test("attachBacklinkPanelScrollCleanup registers and unregisters gutter cleanup", () => {
  const listeners = new Map();
  const calls = [];
  const element = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
  };

  const detach = attachBacklinkPanelScrollCleanup({
    element,
    onCleanup: () => calls.push("cleanup"),
  });

  listeners.get("scroll")();
  assert.deepEqual(calls, ["cleanup"]);

  detach();
  assert.equal(listeners.has("scroll"), false);
});

test("destroyBacklinkPanelHost tears down panel instances and event handlers", () => {
  const calls = [];
  destroyBacklinkPanelHost({
    panelInstance: {
      $destroy() {
        calls.push("destroy-panel");
      },
    },
    detachScrollCleanup() {
      calls.push("detach-scroll");
    },
  });

  assert.deepEqual(calls, ["detach-scroll", "destroy-panel"]);
});

test("getBacklinkPanelPageFocusBlockId reads the current protyle block id", () => {
  assert.equal(
    getBacklinkPanelPageFocusBlockId({
      block: {
        id: "block-1",
      },
    }),
    "block-1",
  );
  assert.equal(getBacklinkPanelPageFocusBlockId(null), null);
});

test("updateBacklinkPanelPageProps pushes the latest focus props into the panel instance", () => {
  const calls = [];
  updateBacklinkPanelPageProps({
    panelInstance: {
      $set(props) {
        calls.push(props);
      },
    },
    rootId: "doc-1",
    focusBlockId: "block-1",
    currentTab: { id: "tab-1" },
    panelBacklinkViewExpand: false,
  });

  assert.deepEqual(calls, [
    {
      rootId: "doc-1",
      focusBlockId: "block-1",
      currentTab: { id: "tab-1" },
      panelBacklinkViewExpand: false,
    },
  ]);
});
