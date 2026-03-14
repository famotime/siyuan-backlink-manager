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
  });

  assert.match(html, /Document A/);
  assert.match(html, /2\/3/);
  assert.match(html, /aria-label="A{100}"/);
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
    },
  });

  assert.equal(documentLiElement.attrs["data-backlink-block-id"], "block-a");
  assert.equal(progressElement.textContent, "1/1");
  assert.equal(textElement.attrs["aria-label"], "content");
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
  ]);
});
