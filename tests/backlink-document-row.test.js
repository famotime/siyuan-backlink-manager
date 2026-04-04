import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkBreadcrumbItems,
  buildBacklinkDocumentListItemHtml,
  createBacklinkDocumentListItemElement,
  updateBacklinkDocumentLiNavigation,
} from "../src/components/panel/backlink-document-row.js";

test("buildBacklinkBreadcrumbItems keeps only the matched in-document heading path", () => {
  const breadcrumbItems = buildBacklinkBreadcrumbItems({
    backlinkBlock: {
      id: "target-block",
      root_id: "doc-a",
    },
    blockPaths: [
      {
        id: "doc-a",
        name: "Document A",
        type: "d",
        subType: "",
        children: [
          {
            id: "wrong-heading",
            name: "重复标题",
            type: "h",
            subType: "h2",
            children: [
              {
                id: "wrong-leaf",
                name: "错误节点",
                type: "p",
                subType: "",
                children: [],
              },
            ],
          },
          {
            id: "matched-heading",
            name: "重复标题",
            type: "h",
            subType: "h2",
            children: [
              {
                id: "list-shell",
                name: "列表项",
                type: "i",
                subType: "",
                children: [
                  {
                    id: "target-block",
                    name: "列表项",
                    type: "p",
                    subType: "",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    breadcrumbItems.map((item) => `${item.id}:${item.label}`),
    ["matched-heading:重复标题"],
  );
});

test("buildBacklinkBreadcrumbItems returns empty when the matched path contains no heading nodes", () => {
  const breadcrumbItems = buildBacklinkBreadcrumbItems({
    backlinkBlock: {
      id: "target-block",
      root_id: "doc-a",
    },
    blockPaths: [
      {
        id: "doc-a",
        name: "Document A",
        type: "d",
        subType: "",
        children: [
          {
            id: "list-shell",
            name: "列表项",
            type: "i",
            subType: "",
            children: [
              {
                id: "target-block",
                name: "正文段落",
                type: "p",
                subType: "",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(breadcrumbItems, []);
});

test("buildBacklinkBreadcrumbItems supports flat SiYuan blockPaths with NodeHeading items", () => {
  const breadcrumbItems = buildBacklinkBreadcrumbItems({
    backlinkBlock: {
      id: "target-paragraph",
      root_id: "doc-a",
    },
    blockPaths: [
      {
        id: "doc-a",
        name: "插件测试笔记本/主题笔记/~Skills/Claude Skills 不就是把提示词存个文件夹吗？ ***",
        type: "NodeDocument",
        subType: "",
        children: null,
      },
      {
        id: "heading-1",
        name: "二、Skills：让 Claude 真正「学会干活」",
        type: "NodeHeading",
        subType: "h2",
        children: null,
      },
      {
        id: "heading-2",
        name: "1. Skills 是什么？",
        type: "NodeHeading",
        subType: "h3",
        children: null,
      },
      {
        id: "target-paragraph",
        name: "",
        type: "NodeParagraph",
        subType: "",
        children: null,
      },
    ],
  });

  assert.deepEqual(
    breadcrumbItems.map((item) => `${item.id}:${item.label}`),
    [
      "heading-1:二、Skills：让 Claude 真正「学会干活」",
      "heading-2:1. Skills 是什么？",
    ],
  );
});

test("buildBacklinkDocumentListItemHtml renders title aria text and progress text", () => {
  const html = buildBacklinkDocumentListItemHtml({
    documentName: "Document A",
    docAriaText: "A".repeat(120),
    progressText: "2/3",
    breadcrumbItems: [
      { id: "doc-a", label: "Document A", clickable: false },
      { id: "heading-1", label: "二、Skills", clickable: true },
      { id: "heading-2", label: "1. Skills 是什么？", clickable: true },
    ],
    contextControlState: {
      contextVisibilityLevel: "core",
      levelLabel: "核心",
      nextActionText: "下一步：近邻",
      visibleSourceSummary: "已显示：反链块",
      budgetHint: "部分上下文已裁剪，继续展开查看更多",
      previousDisabled: true,
      nextDisabled: false,
    },
  });

  assert.match(html, /Document A/);
  assert.match(html, /2\/3/);
  assert.match(html, /aria-label="A{100}"/);
  assert.match(
    html,
    /title="左键在主窗口打开文档，右键在右侧打开文档"/,
  );
  assert.match(html, /backlink-document-header-row/);
  assert.match(html, /backlink-document-title-row/);
  assert.match(html, /backlink-document-nav-group/);
  assert.match(html, /backlink-context-control-row/);
  assert.match(html, /protyle-breadcrumb__bar/);
  assert.match(html, /backlink-breadcrumb-row/);
  assert.match(html, /data-node-id="heading-1"/);
  assert.match(html, /1\. Skills 是什么/);
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
  assert.doesNotMatch(html, /backlink-context-source/);
  assert.doesNotMatch(html, /backlink-context-summary/);
  assert.doesNotMatch(html, /标题：/);
  assert.doesNotMatch(html, /列表：/);
  assert.match(html, /backlink-context-budget-hint/);
  assert.match(html, /部分上下文已裁剪/);
});

test("updateBacklinkDocumentLiNavigation updates progress text, aria label, breadcrumb, and disabled state", () => {
  const progressElement = { textContent: "" };
  const previousButton = { classList: { toggle: (name, state) => (previousButton[name] = state) } };
  const nextButton = { classList: { toggle: (name, state) => (nextButton[name] = state) } };
  const textElement = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const breadcrumbElement = { innerHTML: "" };
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
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
  const nextContextButton = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
  const stateGroupElement = { innerHTML: "" };
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
      if (selector === ".backlink-context-control-row") return controlRowElement;
      if (selector === ".backlink-breadcrumb-row") return breadcrumbElement;
      if (selector === ".backlink-context-step-button.previous") return previousContextButton;
      if (selector === ".backlink-context-step-button.next") return nextContextButton;
      if (selector === ".backlink-context-state-group") return stateGroupElement;
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
      blockPaths: [
        { id: "doc-a", name: "Document A", type: "d", subType: "", children: [] },
        { id: "heading-1", name: "二、Skills", type: "h", subType: "h2", children: [] },
        { id: "heading-2", name: "1. Skills 是什么？", type: "h", subType: "h2", children: [] },
      ],
    },
  }, {
    contextVisibilityLevel: "nearby",
    levelLabel: "近邻",
    nextLevelLabel: "扩展",
    nextActionText: "下一步：扩展",
    visibleSourceSummary: "已显示：父级、前相邻块",
    budgetHint: "部分上下文已裁剪，继续展开查看更多",
    previousDisabled: false,
    nextDisabled: false,
  });

  assert.equal(documentLiElement.attrs["data-backlink-block-id"], "block-a");
  assert.equal(progressElement.textContent, "1/1");
  assert.equal(textElement.attrs["aria-label"], "content");
  assert.equal(
    textElement.attrs.title,
    "左键在主窗口打开文档，右键在右侧打开文档",
  );
  assert.match(breadcrumbElement.innerHTML, /protyle-breadcrumb__item/);
  assert.match(breadcrumbElement.innerHTML, /data-node-id="heading-1"/);
  assert.match(breadcrumbElement.innerHTML, /1\. Skills 是什么/);
  assert.doesNotMatch(breadcrumbElement.innerHTML, /Document A/);
  assert.equal(controlRowElement.attrs["data-context-level"], "近邻");
  assert.equal(
    previousContextButton.attrs["aria-label"],
    "切换到上一个上下文层级",
  );
  assert.equal(
    nextContextButton.attrs["aria-label"],
    "切换到下一个上下文层级",
  );
  assert.equal(previousContextButton.attrs.disabled, undefined);
  assert.equal(nextContextButton.attrs.disabled, undefined);
  assert.match(
    stateGroupElement.innerHTML,
    /backlink-chip backlink-chip--flat backlink-context-state active/,
  );
  assert.match(stateGroupElement.innerHTML, /近邻/);
  assert.equal(budgetHintElement.textContent, "部分上下文已裁剪，继续展开查看更多");
  assert.equal(previousButton.disabled, false);
  assert.equal(nextButton.disabled, false);
});

test("updateBacklinkDocumentLiNavigation keeps context step buttons enabled for cyclic navigation", () => {
  const previousContextButton = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
  const nextContextButton = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
  const documentLiElement = {
    setAttribute() {},
    querySelector(selector) {
      if (selector === ".backlink-context-step-button.previous") {
        return previousContextButton;
      }
      if (selector === ".backlink-context-step-button.next") {
        return nextContextButton;
      }
      return null;
    },
  };

  const documentGroup = {
    progressText: "1/1",
    backlinks: [{}],
    activeBacklink: {
      backlinkBlock: {
        id: "block-a",
        content: "content",
      },
      contextBundle: {
        matchSummaryList: [],
      },
    },
  };

  updateBacklinkDocumentLiNavigation(documentLiElement, documentGroup, {
    contextVisibilityLevel: "core",
    previousDisabled: false,
    nextDisabled: false,
  });

  assert.equal(previousContextButton.attrs.disabled, undefined);
  assert.equal(nextContextButton.attrs.disabled, undefined);

  updateBacklinkDocumentLiNavigation(documentLiElement, documentGroup, {
    contextVisibilityLevel: "full",
    previousDisabled: false,
    nextDisabled: false,
  });

  assert.equal(previousContextButton.attrs.disabled, undefined);
  assert.equal(nextContextButton.attrs.disabled, undefined);
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
  const breadcrumbElement = {
    addEventListener(type, handler) {
      listeners[`breadcrumb:${type}`] = handler;
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
      if (selector === ".backlink-breadcrumb-row") {
        return breadcrumbElement;
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
    onBreadcrumbNavigate: (_, blockId) => calls.push(`breadcrumb:${blockId}`),
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
  listeners["breadcrumb:click"]({
    preventDefault() {},
    stopPropagation() {},
    target: {
      closest(selector) {
        if (selector !== ".backlink-breadcrumb__item") {
          return null;
        }
        return {
          getAttribute(name) {
            return name === "data-node-id" ? "heading-1" : null;
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
    "breadcrumb:heading-1",
  ]);
});
