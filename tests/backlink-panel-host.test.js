import test from "node:test";
import assert from "node:assert/strict";

import {
  attachBacklinkPanelScrollCleanup,
  buildBacklinkPanelPageProps,
  destroyBacklinkPanelHost,
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
