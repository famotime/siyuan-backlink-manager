import test from "node:test";
import assert from "node:assert/strict";

import {
  activateBacklinkDocumentMainArea,
  getActiveBacklinkDocumentMainAreaTabElement,
  getBacklinkDocumentOpenDebugSnapshot,
  getBacklinkDocumentMainAreaWnd,
  getBacklinkDocumentOpenTarget,
  getBacklinkDocumentPreClickOpenArea,
  getBacklinkDocumentWndElementFromTarget,
  resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache,
  mergeBacklinkDocumentOpenTargetIntoTabOptions,
  resolveBacklinkDocumentOpenArea,
  resolveBacklinkDocumentPreClickOpenAreaFromWndElements,
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
      tab: {
        headElement: {
          classList: {
            contains(name) {
              return name === "item--focus";
            },
          },
        },
        parent: {
          element: backlinkWndElement,
        },
      },
    },
    documentRef: {
      activeElement: {
        closest(selector) {
          return selector === ".layout__wnd" ? backlinkWndElement : null;
        },
      },
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
  const mainWndElement = { id: "main-wnd" };
  const openArea = getBacklinkDocumentPreClickOpenArea({
    currentTab: {
      tab: {
        headElement: {
          classList: {
            contains() {
              return false;
            },
          },
        },
        parent: {
          element: { id: "backlink-wnd" },
        },
      },
    },
    documentRef: {
      activeElement: {
        closest(selector) {
          return selector === ".layout__wnd" ? mainWndElement : null;
        },
      },
      querySelector(selector) {
        return selector === "div.layout__wnd--active" ? null : null;
      },
    },
  });

  assert.equal(openArea, "main");
});

test("falls back to right-side opening when the pre-click active window cannot be detected", () => {
  const openArea = getBacklinkDocumentPreClickOpenArea({
    currentTab: {
      tab: {
        headElement: {
          classList: {
            contains() {
              return false;
            },
          },
        },
      },
    },
    documentRef: {
      activeElement: {
        closest() {
          return null;
        },
      },
      querySelector() {
        return null;
      },
    },
  });

  assert.equal(openArea, "right");
});

test("resolves focus-based open requests using the pre-click active area", () => {
  assert.equal(resolveBacklinkDocumentOpenArea("focus", "main"), "main");
  assert.equal(resolveBacklinkDocumentOpenArea("focus", "right"), "right");
  assert.equal(resolveBacklinkDocumentOpenArea("focus", "focus"), "right");
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
      tab: {
        headElement: {
          id: "tab-right",
          className: "item",
          classList: {
            contains() {
              return false;
            },
          },
          getAttribute(name) {
            return name === "data-id" ? "tab-right-data" : null;
          },
        },
        parent: {
          element: currentWndElement,
        },
      },
    },
    documentRef: {
      activeElement: {
        tagName: "DIV",
        id: "editor-active",
        className: "protyle-content",
        closest(selector) {
          return selector === ".layout__wnd" ? activeWndElement : null;
        },
      },
      querySelector(selector) {
        if (selector === "div.layout__wnd--active") {
          return activeWndElement;
        }
        if (selector === "li.item--focus") {
          return {
            id: "tab-main",
            className: "item item--focus",
            classList: {
              contains(name) {
                return name === "item--focus";
              },
            },
            getAttribute(name) {
              return name === "data-id" ? "tab-main-data" : null;
            },
          };
        }
        return null;
      },
    },
  });

  assert.deepEqual(snapshot, {
    currentTab: {
      id: "tab-right",
      dataId: "tab-right-data",
      className: "item",
      isFocused: false,
    },
    activeTab: {
      id: "tab-main",
      dataId: "tab-main-data",
      className: "item item--focus",
      isFocused: true,
    },
    activeElement: {
      tagName: "DIV",
      id: "editor-active",
      className: "protyle-content",
    },
    focusedWnd: {
      id: "wnd-main",
      dataId: "wnd-main-data",
      className: "layout__wnd layout__wnd--active",
      left: 0,
      width: 780,
    },
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

test("resolves the current window from Custom.tab.parent", () => {
  const backlinkWndElement = {};
  const openArea = getBacklinkDocumentPreClickOpenArea({
    currentTab: {
      tab: {
        headElement: {
          classList: {
            contains(name) {
              return name === "item--focus";
            },
          },
        },
        parent: {
          element: backlinkWndElement,
        },
      },
    },
    documentRef: {
      activeElement: {
        closest(selector) {
          return selector === ".layout__wnd" ? backlinkWndElement : null;
        },
      },
      querySelector(selector) {
        return selector === "div.layout__wnd--active"
          ? backlinkWndElement
          : null;
      },
    },
  });

  assert.equal(openArea, "right");
});

test("resolves pre-click open area from explicit current and focused windows", () => {
  const wndElement = {};
  assert.equal(
    resolveBacklinkDocumentPreClickOpenAreaFromWndElements({
      currentWndElement: wndElement,
      focusedWndElement: wndElement,
    }),
    "right",
  );
  assert.equal(
    resolveBacklinkDocumentPreClickOpenAreaFromWndElements({
      currentWndElement: wndElement,
      focusedWndElement: {},
    }),
    "main",
  );
  assert.equal(
    resolveBacklinkDocumentPreClickOpenAreaFromWndElements({
      currentWndElement: null,
      focusedWndElement: wndElement,
    }),
    "right",
  );
});

test("uses cached focus only for ctrl-left area resolution and defaults to right", () => {
  const backlinkWndElement = {};
  const mainWndElement = {};

  assert.equal(
    resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache({
      currentWndElement: backlinkWndElement,
      cachedFocusedWndElement: null,
      documentRef: {
        activeElement: {
          closest(selector) {
            return selector === ".layout__wnd" ? mainWndElement : null;
          },
        },
        querySelector() {
          return null;
        },
      },
    }),
    "right",
  );
  assert.equal(
    resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache({
      currentWndElement: backlinkWndElement,
      cachedFocusedWndElement: null,
    }),
    "right",
  );
  assert.equal(
    resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache({
      currentWndElement: backlinkWndElement,
      cachedFocusedWndElement: backlinkWndElement,
    }),
    "right",
  );
  assert.equal(
    resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache({
      currentWndElement: backlinkWndElement,
      cachedFocusedWndElement: mainWndElement,
    }),
    "main",
  );
});

test("gets the enclosing layout window from an event target", () => {
  const wndElement = { id: "wnd-main" };
  const target = {
    closest(selector) {
      return selector === ".layout__wnd" ? wndElement : null;
    },
  };

  assert.equal(getBacklinkDocumentWndElementFromTarget(target), wndElement);
});

test("gets the enclosing layout window from a non-element target via parent nodes", () => {
  const wndElement = { id: "wnd-main" };
  const target = {
    parentElement: {
      closest(selector) {
        return selector === ".layout__wnd" ? wndElement : null;
      },
    },
  };

  assert.equal(getBacklinkDocumentWndElementFromTarget(target), wndElement);
});
