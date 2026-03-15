import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkDocumentListItemHtml,
  createBacklinkDocumentListItemElement,
  updateBacklinkDocumentLiNavigation,
} from "../src/components/panel/backlink-document-row.js";

test("buildBacklinkDocumentListItemHtml renders title aria text and progress text", () => {
  const html = buildBacklinkDocumentListItemHtml({
    documentName: "Document A",
    docAriaText: "A".repeat(120),
    progressText: "2/3",
    matchSourceLabel: "父级",
    matchSummaryText: "父级：命中说明",
    contextControlState: {
      contextVisibilityLevel: "core",
      levelLabel: "核心",
    },
  });

  assert.match(html, /Document A/);
  assert.match(html, /2\/3/);
  assert.match(html, /aria-label="A{100}"/);
  assert.match(
    html,
    /title="左键在主窗口打开文档，右键在右侧打开文档，Ctrl\+左键跟随当前焦点打开文档"/,
  );
  assert.match(html, /父级/);
  assert.match(html, /命中说明/);
  assert.match(html, /backlink-document-header-row/);
  assert.match(html, /backlink-chip backlink-chip--flat backlink-context-source/);
  assert.match(html, /backlink-context-control-row/);
  assert.match(html, /backlink-context-step-button/);
  assert.match(html, /backlink-context-step-button previous/);
  assert.match(html, /backlink-context-step-button next/);
  assert.match(html, /backlink-context-state-group/);
  assert.match(
    html,
    /backlink-chip backlink-chip--flat backlink-context-state active/,
  );
  assert.doesNotMatch(html, /backlink-context-next-action/);
  assert.doesNotMatch(html, /backlink-context-visible-summary/);
  assert.doesNotMatch(html, /backlink-context-budget-hint/);
});

test("updateBacklinkDocumentLiNavigation updates progress text, aria label, and disabled state", () => {
  const progressElement = { textContent: "" };
  const previousButton = { classList: { toggle: (name, state) => (previousButton[name] = state) } };
  const nextButton = { classList: { toggle: (name, state) => (nextButton[name] = state) } };
  const textElement = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const sourceElement = { textContent: "" };
  const summaryElement = { textContent: "" };
  const controlRowElement = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const previousContextButton = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const nextContextButton = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const stateGroupElement = { innerHTML: "" };
  const documentLiElement = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    querySelector(selector) {
      if (selector === ".backlink-nav-progress") return progressElement;
      if (selector === ".previous-backlink-icon") return previousButton;
      if (selector === ".next-backlink-icon") return nextButton;
      if (selector === ".b3-list-item__text") return textElement;
      if (selector === ".backlink-context-source") return sourceElement;
      if (selector === ".backlink-context-summary") return summaryElement;
      if (selector === ".backlink-context-control-row") return controlRowElement;
      if (selector === ".backlink-context-step-button.previous") return previousContextButton;
      if (selector === ".backlink-context-step-button.next") return nextContextButton;
      if (selector === ".backlink-context-state-group") return stateGroupElement;
      return null;
    },
  };

  updateBacklinkDocumentLiNavigation(documentLiElement, {
    progressText: "1/1",
    backlinks: [{}, {}],
    activeBacklink: {
      backlinkBlock: {
        id: "block-a",
        content: "content",
      },
      contextBundle: {
        primaryMatchSourceType: "parent",
        matchSummaryList: ["父级：命中说明"],
      },
    },
  }, {
    contextVisibilityLevel: "nearby",
    levelLabel: "近邻",
  });

  assert.equal(documentLiElement.attrs["data-backlink-block-id"], "block-a");
  assert.equal(progressElement.textContent, "1/1");
  assert.equal(textElement.attrs["aria-label"], "content");
  assert.equal(
    textElement.attrs.title,
    "左键在主窗口打开文档，右键在右侧打开文档，Ctrl+左键跟随当前焦点打开文档",
  );
  assert.equal(sourceElement.textContent, "父级");
  assert.equal(summaryElement.textContent, "父级：命中说明");
  assert.equal(controlRowElement.attrs["data-context-level"], "近邻");
  assert.equal(
    previousContextButton.attrs["aria-label"],
    "切换到上一个上下文层级",
  );
  assert.equal(
    nextContextButton.attrs["aria-label"],
    "切换到下一个上下文层级",
  );
  assert.match(
    stateGroupElement.innerHTML,
    /backlink-chip backlink-chip--flat backlink-context-state active/,
  );
  assert.match(stateGroupElement.innerHTML, /近邻/);
  assert.equal(previousButton.disabled, false);
  assert.equal(nextButton.disabled, false);
});

test("createBacklinkDocumentListItemElement wires toggle and navigation events", () => {
  const calls = [];
  const listeners = {};
  const previousButton = {
    addEventListener(type, handler) {
      listeners[`previous:${type}`] = handler;
    },
  };
  const nextButton = {
    addEventListener(type, handler) {
      listeners[`next:${type}`] = handler;
    },
  };
  const toggleButton = {
    addEventListener(type, handler) {
      listeners[`toggle:${type}`] = handler;
    },
  };
  const previousContextButton = {
    addEventListener(type, handler) {
      listeners[`context-previous:${type}`] = handler;
    },
  };
  const nextContextButton = {
    addEventListener(type, handler) {
      listeners[`context-next:${type}`] = handler;
    },
  };
  const stateGroupElement = {
    addEventListener(type, handler) {
      listeners[`context-state-group:${type}`] = handler;
    },
  };
  const documentLiElement = {
    classList: { add() {} },
    attrs: {},
    innerHTML: "",
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    addEventListener(type, handler) {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(handler);
    },
    querySelector(selector) {
      if (selector === ".b3-list-item__toggle") return toggleButton;
      if (selector === ".previous-backlink-icon") return previousButton;
      if (selector === ".next-backlink-icon") return nextButton;
      if (selector === ".backlink-context-step-button.previous") {
        return previousContextButton;
      }
      if (selector === ".backlink-context-step-button.next") {
        return nextContextButton;
      }
      if (selector === ".backlink-context-state-group") {
        return stateGroupElement;
      }
      return null;
    },
  };

  const appended = [];
  const created = createBacklinkDocumentListItemElement({
    documentGroup: {
      documentId: "doc-a",
      documentName: "Document A",
      progressText: "1/2",
      activeBacklink: {
        backlinkBlock: {
          id: "block-a",
          content: "content-a",
        },
      },
    },
    parentElement: {
      append(node) {
        appended.push(node);
      },
    },
    documentRef: {
      createElement() {
        return documentLiElement;
      },
    },
    onDocumentClick: () => calls.push("document-click"),
    onMouseDown: () => calls.push("mousedown"),
    onContextMenu: () => calls.push("contextmenu"),
    onToggle: () => calls.push("toggle"),
    onNavigate: (_, direction) => calls.push(direction),
    onStepContextLevel: (_, direction) => calls.push(`context-${direction}`),
    contextControlState: {
      contextVisibilityLevel: "core",
      levelLabel: "核心",
    },
  });

  listeners.mousedown[0]({
    button: 0,
  });
  listeners.click[0]({});
  listeners.contextmenu[0]({});
  listeners["toggle:click"]({
    preventDefault() {},
    stopPropagation() {},
  });
  listeners["previous:click"]({
    stopPropagation() {},
  });
  listeners["next:click"]({
    stopPropagation() {},
  });
  listeners["context-previous:click"]({
    preventDefault() {},
    stopPropagation() {},
    currentTarget: previousContextButton,
  });
  listeners["context-next:click"]({
    preventDefault() {},
    stopPropagation() {},
    currentTarget: nextContextButton,
  });
  listeners["context-state-group:click"]({
    preventDefault() {},
    stopPropagation() {},
    target: {
      closest(selector) {
        if (selector !== ".backlink-context-state") {
          return null;
        }
        return {
          getAttribute(name) {
            return name === "data-context-level" ? "extended" : null;
          },
        };
      },
    },
  });

  assert.equal(created, documentLiElement);
  assert.equal(appended[0], documentLiElement);
  assert.equal(documentLiElement.attrs["data-node-id"], "doc-a");
  assert.equal(documentLiElement.attrs["data-backlink-block-id"], "block-a");
  assert.deepEqual(calls, [
    "mousedown",
    "document-click",
    "contextmenu",
    "toggle",
    "previous",
    "next",
    "context-previous",
    "context-next",
    "context-extended",
  ]);
});
