import test from "node:test";
import assert from "node:assert/strict";

import {
  activateBacklinkDocumentMainArea,
  getActiveBacklinkDocumentMainAreaTabElement,
  getBacklinkDocumentOpenDebugSnapshot,
  getBacklinkDocumentMainAreaWnd,
  getBacklinkDocumentOpenTarget,
  getBacklinkDocumentPreClickOpenArea,
  mergeBacklinkDocumentOpenTargetIntoTabOptions,
  resolveBacklinkDocumentOpenArea,
} from "../src/components/panel/backlink-document-open-target.js";

test("maps right area requests to the right-side tab position", () => {
  assert.deepEqual(getBacklinkDocumentOpenTarget("right"), {
    position: "right",
    shouldActivateMainArea: false,
  });
});

test("maps main area requests to main-area activation without forcing a side position", () => {
  assert.deepEqual(getBacklinkDocumentOpenTarget("main"), {
    position: undefined,
    shouldActivateMainArea: true,
  });
});

test("keeps focus-following requests without forcing area activation", () => {
  assert.deepEqual(getBacklinkDocumentOpenTarget("focus"), {
    shouldActivateMainArea: false,
  });
});

test("chooses the left-side main window instead of the current backlink tab window", () => {
  const leftWnd = {
    element: {
      getBoundingClientRect() {
        return { left: 0 };
      },
    },
    headersElement: {},
  };
  const rightWnd = {
    element: {
      getBoundingClientRect() {
        return { left: 800 };
      },
    },
    headersElement: {},
  };

  const targetWnd = getBacklinkDocumentMainAreaWnd({
    currentTab: { parent: rightWnd },
    windowRef: {
      siyuan: {
        layout: {
          centerLayout: {
            children: [rightWnd, leftWnd],
          },
        },
      },
    },
  });

  assert.equal(targetWnd, leftWnd);
});

test("uses the main window active tab head element when available", () => {
  const activeTabHeadElement = {};
  const tabElement = getActiveBacklinkDocumentMainAreaTabElement({
    currentTab: { parent: { id: "right" } },
    windowRef: {
      siyuan: {
        layout: {
          centerLayout: {
            children: [
              {
                element: {
                  getBoundingClientRect() {
                    return { left: 0 };
                  },
                },
                headersElement: {
                  querySelector(selector) {
                    return selector === "li.item--focus"
                      ? activeTabHeadElement
                      : null;
                  },
                },
              },
              {
                id: "right",
                element: {
                  getBoundingClientRect() {
                    return { left: 800 };
                  },
                },
                headersElement: {
                  querySelector() {
                    return null;
                  },
                },
              },
            ],
          },
        },
      },
    },
  });

  assert.equal(tabElement, activeTabHeadElement);
});

test("falls back to the first tab head element in the main window", () => {
  const firstTabHeadElement = {};
  const tabElement = getActiveBacklinkDocumentMainAreaTabElement({
    currentTab: { parent: { id: "right" } },
    windowRef: {
      siyuan: {
        layout: {
          centerLayout: {
            children: [
              {
                element: {
                  getBoundingClientRect() {
                    return { left: 0 };
                  },
                },
                headersElement: {
                  querySelector() {
                    return null;
                  },
                },
                children: [
                  {
                    headElement: firstTabHeadElement,
                  },
                ],
              },
              {
                id: "right",
                element: {
                  getBoundingClientRect() {
                    return { left: 800 };
                  },
                },
                headersElement: {
                  querySelector() {
                    return null;
                  },
                },
              },
            ],
          },
        },
      },
    },
  });

  assert.equal(tabElement, firstTabHeadElement);
});

test("activates the left-side main window tab before opening a document", () => {
  const calls = [];
  const targetTabHeadElement = {
    click() {
      calls.push("click");
    },
  };
  const activated = activateBacklinkDocumentMainArea({
    currentTab: { parent: { id: "right" } },
    windowRef: {
      siyuan: {
        layout: {
          centerLayout: {
            children: [
              {
                element: {
                  getBoundingClientRect() {
                    return { left: 0 };
                  },
                },
                headersElement: {
                  querySelector(selector) {
                    calls.push(selector);
                    return selector === "li.item--focus"
                      ? targetTabHeadElement
                      : null;
                  },
                },
              },
              {
                id: "right",
                element: {
                  getBoundingClientRect() {
                    return { left: 800 };
                  },
                },
                headersElement: {
                  querySelector() {
                    return null;
                  },
                },
              },
            ],
          },
        },
      },
    },
  });

  assert.equal(activated, true);
  assert.deepEqual(calls, ["li.item--focus", "click"]);
});

test("returns false when there is no main-area tab to activate", () => {
  const activated = activateBacklinkDocumentMainArea({
    currentTab: { parent: { id: "right" } },
    windowRef: {
      siyuan: {
        layout: {
          centerLayout: {
            children: [],
          },
        },
      },
    },
  });

  assert.equal(activated, false);
});

test("does not inject a position field for focus-following open requests", () => {
  const options = mergeBacklinkDocumentOpenTargetIntoTabOptions(
    {
      app: {},
      doc: {
        id: "block-1",
      },
    },
    getBacklinkDocumentOpenTarget("focus"),
  );

  assert.equal("position" in options, false);
});

test("captures right-side opening when the backlink tab window is active before click", () => {
  const backlinkWndElement = {};
  const openArea = getBacklinkDocumentPreClickOpenArea({
    currentTab: {
      parent: {
        element: backlinkWndElement,
      },
    },
    documentRef: {
      querySelector(selector) {
        return selector === "div.layout__wnd--active"
          ? backlinkWndElement
          : null;
      },
    },
  });

  assert.equal(openArea, "right");
});

test("captures main-area opening when another window is active before click", () => {
  const openArea = getBacklinkDocumentPreClickOpenArea({
    currentTab: {
      parent: {
        element: { id: "backlink-wnd" },
      },
    },
    documentRef: {
      querySelector(selector) {
        return selector === "div.layout__wnd--active"
          ? { id: "main-wnd" }
          : null;
      },
    },
  });

  assert.equal(openArea, "main");
});

test("falls back to focus mode when the pre-click active window cannot be detected", () => {
  const openArea = getBacklinkDocumentPreClickOpenArea({
    currentTab: null,
    documentRef: {
      querySelector() {
        return null;
      },
    },
  });

  assert.equal(openArea, "focus");
});

test("resolves focus-based open requests using the pre-click active area", () => {
  assert.equal(resolveBacklinkDocumentOpenArea("focus", "main"), "main");
  assert.equal(resolveBacklinkDocumentOpenArea("focus", "right"), "right");
  assert.equal(resolveBacklinkDocumentOpenArea("main", "right"), "main");
});

test("builds a debug snapshot for the current and active window state", () => {
  const currentWndElement = {
    id: "wnd-right",
    className: "layout__wnd",
    getAttribute(name) {
      return name === "data-id" ? "wnd-right-data" : null;
    },
    getBoundingClientRect() {
      return { left: 800, width: 320 };
    },
  };
  const activeWndElement = {
    id: "wnd-main",
    className: "layout__wnd layout__wnd--active",
    getAttribute(name) {
      return name === "data-id" ? "wnd-main-data" : null;
    },
    getBoundingClientRect() {
      return { left: 0, width: 780 };
    },
  };

  const snapshot = getBacklinkDocumentOpenDebugSnapshot({
    currentTab: {
      parent: {
        element: currentWndElement,
      },
    },
    documentRef: {
      querySelector(selector) {
        return selector === "div.layout__wnd--active" ? activeWndElement : null;
      },
    },
  });

  assert.deepEqual(snapshot, {
    currentWnd: {
      id: "wnd-right",
      dataId: "wnd-right-data",
      className: "layout__wnd",
      left: 800,
      width: 320,
    },
    activeWnd: {
      id: "wnd-main",
      dataId: "wnd-main-data",
      className: "layout__wnd layout__wnd--active",
      left: 0,
      width: 780,
    },
    inferredPreClickOpenArea: "main",
  });
});
