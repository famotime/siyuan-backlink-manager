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
      levelLabel: "核心",
      nextActionLabel: "展开到近邻",
      visibleSummaryText: "已显示：反链块、文档",
      budgetHintText: "部分上下文已裁剪",
      hasMoreContext: true,
    },
  });

  assert.match(html, /Document A/);
  assert.match(html, /2\/3/);
  assert.match(html, /aria-label="A{100}"/);
  assert.match(html, /父级/);
  assert.match(html, /命中说明/);
  assert.match(html, /title="单击逐级展开上下文，Ctrl\+单击打开反链块"/);
  assert.match(html, /backlink-context-control-row/);
  assert.match(html, /backlink-context-level-button/);
  assert.match(html, /展开到近邻/);
  assert.match(html, /已显示：反链块、文档/);
  assert.match(html, /部分上下文已裁剪/);
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
  const controlButtonElement = { textContent: "", attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const nextActionElement = { textContent: "" };
  const visibleSummaryElement = { textContent: "" };
  const budgetHintElement = { textContent: "" };
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
      if (selector === ".backlink-context-level-button") return controlButtonElement;
      if (selector === ".backlink-context-next-action") return nextActionElement;
      if (selector === ".backlink-context-visible-summary") return visibleSummaryElement;
      if (selector === ".backlink-context-budget-hint") return budgetHintElement;
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
    levelLabel: "近邻",
    nextActionLabel: "展开到扩展",
    visibleSummaryText: "已显示：前相邻块、后相邻块",
    budgetHintText: "部分上下文已裁剪",
    hasMoreContext: true,
  });

  assert.equal(documentLiElement.attrs["data-backlink-block-id"], "block-a");
  assert.equal(progressElement.textContent, "1/1");
  assert.equal(textElement.attrs["aria-label"], "content");
  assert.equal(
    textElement.attrs.title,
    "单击逐级展开上下文，Ctrl+单击打开反链块",
  );
  assert.equal(sourceElement.textContent, "父级");
  assert.equal(summaryElement.textContent, "父级：命中说明");
  assert.equal(controlRowElement.attrs["data-context-level"], "近邻");
  assert.equal(controlRowElement.attrs["data-has-more-context"], "true");
  assert.equal(controlButtonElement.textContent, "近邻");
  assert.equal(controlButtonElement.attrs["aria-label"], "当前上下文层级：近邻。点击展开到扩展");
  assert.equal(nextActionElement.textContent, "展开到扩展");
  assert.equal(visibleSummaryElement.textContent, "已显示：前相邻块、后相邻块");
  assert.equal(budgetHintElement.textContent, "部分上下文已裁剪");
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
  const advanceButton = {
    addEventListener(type, handler) {
      listeners[`advance:${type}`] = handler;
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
      listeners[type] = handler;
    },
    querySelector(selector) {
      if (selector === ".b3-list-item__toggle") return toggleButton;
      if (selector === ".previous-backlink-icon") return previousButton;
      if (selector === ".next-backlink-icon") return nextButton;
      if (selector === ".backlink-context-level-button") return advanceButton;
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
    onContextMenu: () => calls.push("contextmenu"),
    onToggle: () => calls.push("toggle"),
    onNavigate: (_, direction) => calls.push(direction),
    onAdvanceContextLevel: () => calls.push("advance"),
    contextControlState: {
      levelLabel: "核心",
      nextActionLabel: "展开到近邻",
      hasMoreContext: true,
    },
  });

  listeners.click({});
  listeners.contextmenu({});
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
  listeners["advance:click"]({
    preventDefault() {},
    stopPropagation() {},
    currentTarget: advanceButton,
  });

  assert.equal(created, documentLiElement);
  assert.equal(appended[0], documentLiElement);
  assert.equal(documentLiElement.attrs["data-node-id"], "doc-a");
  assert.equal(documentLiElement.attrs["data-backlink-block-id"], "block-a");
  assert.deepEqual(calls, [
    "document-click",
    "contextmenu",
    "toggle",
    "previous",
    "next",
    "advance",
  ]);
});
