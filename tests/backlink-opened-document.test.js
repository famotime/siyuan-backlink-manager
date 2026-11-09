import test from "node:test";
import assert from "node:assert/strict";

import {
  activateOpenedDocumentTab,
  findOpenedDocumentEditorElement,
  findOpenedDocumentInfo,
  navigateToOpenedDocumentBlock,
} from "../src/components/panel/backlink-opened-document.js";

test("findOpenedDocumentInfo locates an opened tab through the layout model tree", () => {
  const protyle = { block: { rootID: "doc-1" }, element: "editor-el" };
  const windowRef = {
    siyuan: {
      layout: {
        center: {
          children: [
            { headElement: null },
            {
              headElement: { name: "head" },
              model: { editor: { protyle } },
            },
          ],
        },
      },
    },
  };

  const docInfo = findOpenedDocumentInfo("doc-1", {
    documentRef: null,
    windowRef,
  });

  assert.equal(docInfo.tab, windowRef.siyuan.layout.center.children[1]);
  assert.equal(docInfo.editorElement, "editor-el");
  assert.equal(docInfo.protyle, protyle);
  assert.equal(docInfo.tabHeadElement.name, "head");
});

test("findOpenedDocumentInfo falls back to DOM lookup when the model tree misses", () => {
  const editorEl = {
    getAttribute: () => "tab-9",
    closest: () => null,
  };
  const titleEl = {
    closest: (selector) => (selector === ".protyle" ? editorEl : null),
  };
  const documentRef = {
    querySelectorAll: (selector) =>
      selector.startsWith(".protyle-title") ? [titleEl] : [],
    querySelector: (selector) =>
      selector.includes("tab-9") ? "tab-head" : null,
  };

  const docInfo = findOpenedDocumentInfo("doc-dom", {
    documentRef,
    windowRef: {},
  });

  assert.equal(docInfo.tab, null);
  assert.equal(docInfo.editorElement, editorEl);
  assert.equal(docInfo.tabHeadElement, "tab-head");
  assert.equal(docInfo.protyle, null);
});

test("findOpenedDocumentInfo returns null for missing rootId or unmatched documents", () => {
  assert.equal(
    findOpenedDocumentInfo("", { documentRef: null, windowRef: {} }),
    null,
  );
  assert.equal(
    findOpenedDocumentInfo("doc-x", {
      documentRef: { querySelectorAll: () => [] },
      windowRef: {},
    }),
    null,
  );
});

test("findOpenedDocumentEditorElement returns the editor element or null", () => {
  const editorEl = { closest: () => null };
  const titleEl = { closest: () => editorEl };
  const documentRef = {
    querySelectorAll: (selector) =>
      selector.startsWith(".protyle-title") ? [titleEl] : [],
    querySelector: () => null,
  };

  assert.equal(
    findOpenedDocumentEditorElement("doc-dom", documentRef, {}),
    editorEl,
  );
  assert.equal(
    findOpenedDocumentEditorElement("doc-x", { querySelectorAll: () => [] }, {}),
    null,
  );
});

test("activateOpenedDocumentTab prefers the model tree switchTab path", () => {
  const switched = [];
  const tab = { parent: { switchTab: (t) => switched.push(t) } };

  assert.equal(activateOpenedDocumentTab({ tab }), true);
  assert.deepEqual(switched, [tab]);
});

test("activateOpenedDocumentTab clicks the tab head and activates the wnd", () => {
  // Node 环境无 DOM MouseEvent，打桩以覆盖 dispatchEvent 分支
  const realMouseEvent = globalThis.MouseEvent;
  globalThis.MouseEvent = class MouseEvent {
    constructor(type, options) {
      this.type = type;
      this.bubbles = options?.bubbles === true;
    }
  };
  try {
    const clicked = [];
    const wndClassList = {
      contains: () => false,
      added: [],
      add(name) {
        this.added.push(name);
      },
    };
    const tabHead = {
      click: () => clicked.push("click"),
      dispatchEvent: (event) => clicked.push(`dispatch:${event.type}`),
      closest: () => ({ classList: wndClassList }),
    };

    assert.equal(activateOpenedDocumentTab({ tabHeadElement: tabHead }), true);
    assert.deepEqual(clicked, ["click", "dispatch:click"]);
    assert.deepEqual(wndClassList.added, ["layout__wnd--active"]);
  } finally {
    globalThis.MouseEvent = realMouseEvent;
  }
});

test("activateOpenedDocumentTab returns false when no activation target exists", () => {
  assert.equal(activateOpenedDocumentTab({}), false);
  assert.equal(activateOpenedDocumentTab(null), false);
});

test("navigateToOpenedDocumentBlock returns false when the document is not open", () => {
  assert.equal(
    navigateToOpenedDocumentBlock({
      rootId: "doc-x",
      documentRef: { querySelectorAll: () => [] },
      windowRef: {},
    }),
    false,
  );
});

test("navigateToOpenedDocumentBlock scrolls the document root to top and focuses the title", () => {
  const calls = [];
  const scrollContainer = {
    scrollTo: (options) => calls.push(["scroll", options.top]),
  };
  const titleInput = { focus: () => calls.push(["focus"]) };
  const editorEl = {
    querySelector: (selector) => {
      if (selector === ".protyle-content") return scrollContainer;
      if (selector === ".protyle-title__input") return titleInput;
      return null;
    },
  };
  const documentRef = {
    querySelectorAll: (selector) =>
      selector.startsWith(".protyle-title") ? [{ closest: () => editorEl }] : [],
    querySelector: () => null,
  };

  assert.equal(
    navigateToOpenedDocumentBlock({
      rootId: "doc-dom",
      documentRef,
      windowRef: {},
    }),
    true,
  );
  assert.deepEqual(calls, [["scroll", 0], ["focus"]]);
});

test("navigateToOpenedDocumentBlock highlights the target block via protyle.scroll", () => {
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => {};
  try {
    const calls = [];
    const blockEl = {
      classList: {
        added: [],
        add(name) {
          this.added.push(name);
        },
        remove() {},
      },
    };
    const editorEl = {
      querySelector: (selector) =>
        selector.includes("block-1") ? blockEl : null,
    };
    const protyle = {
      block: { rootID: "doc-1" },
      scroll: (blockId, position, callback) => {
        calls.push(["scroll", blockId, position]);
        callback();
      },
    };
    const windowRef = {
      siyuan: {
        layout: {
          center: {
            children: [
              {
                headElement: {},
                model: { protyle },
                panelElement: editorEl,
              },
            ],
          },
        },
      },
    };

    assert.equal(
      navigateToOpenedDocumentBlock({
        rootId: "doc-1",
        blockId: "block-1",
        documentRef: null,
        windowRef,
      }),
      true,
    );
    assert.deepEqual(calls, [["scroll", "block-1", 0]]);
    assert.deepEqual(blockEl.classList.added, ["protyle-wysiwyg--hl"]);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});

test("navigateToOpenedDocumentBlock reuses the open tab when the block is not rendered yet", () => {
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => {};
  try {
    const openTabCalls = [];
    const editorEl = { querySelector: () => null };
    const documentRef = {
      querySelectorAll: (selector) =>
        selector.startsWith(".protyle-title") ? [{ closest: () => editorEl }] : [],
      querySelector: () => null,
    };

    assert.equal(
      navigateToOpenedDocumentBlock({
        rootId: "doc-dom",
        blockId: "block-virtual",
        documentRef,
        windowRef: {},
        app: { name: "app" },
        openTabFn: (options) => openTabCalls.push(options),
      }),
      true,
    );
    assert.equal(openTabCalls.length, 1);
    assert.equal(openTabCalls[0].doc.id, "block-virtual");
    assert.equal(openTabCalls[0].openNewTab, false);
    assert.deepEqual(openTabCalls[0].doc.action, [
      "cb-get-hl",
      "cb-get-context",
      "cb-get-rootscroll",
    ]);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});

test("navigateToOpenedDocumentBlock still reports success after tab activation when no locator works", () => {
  const editorEl = { querySelector: () => null };
  const documentRef = {
    querySelectorAll: (selector) =>
      selector.startsWith(".protyle-title") ? [{ closest: () => editorEl }] : [],
    querySelector: () => null,
  };

  assert.equal(
    navigateToOpenedDocumentBlock({
      rootId: "doc-dom",
      blockId: "block-x",
      documentRef,
      windowRef: {},
    }),
    true,
  );
});
