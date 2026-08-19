import test from "node:test";
import assert from "node:assert/strict";

import { resolveBacklinkTargetBlocks } from "../src/service/backlink/backlink-target-resolver.js";
import {
  buildBacklinkTargetBlockItemHtml,
  buildBacklinkTargetSectionHtml,
  updateBacklinkTargetSection,
  updateBacklinkDocumentLiNavigation,
} from "../src/components/panel/backlink-document-row.js";
import { resolveSettingConfig } from "../src/service/setting/setting-config-resolver.js";

test("resolveBacklinkTargetBlocks returns current document target block when referencing rootId", () => {
  const curRootId = "doc-root-123";
  const relatedDefBlockAndDocumentMap = new Map([
    [curRootId, { id: curRootId, type: "d", content: "我的知识库文档", root_id: curRootId }],
  ]);
  const backlinkBlockNode = {
    includeCurBlockDefBlockIds: new Set([curRootId]),
    includeDirectDefBlockIds: new Set([curRootId]),
  };

  const targets = resolveBacklinkTargetBlocks({
    backlinkBlockNode,
    curRootId,
    relatedDefBlockAndDocumentMap,
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0].id, curRootId);
  assert.equal(targets[0].type, "d");
  assert.equal(targets[0].content, "我的知识库文档");
  assert.equal(targets[0].rootId, curRootId);
});

test("resolveBacklinkTargetBlocks returns specific heading block when referencing an in-document heading", () => {
  const curRootId = "doc-root-123";
  const headingBlockId = "block-heading-456";
  const relatedDefBlockAndDocumentMap = new Map([
    [curRootId, { id: curRootId, type: "d", content: "主文档", root_id: curRootId }],
    [headingBlockId, { id: headingBlockId, type: "h", subtype: "h2", content: "核心概念介绍", root_id: curRootId }],
  ]);
  const backlinkBlockNode = {
    includeCurBlockDefBlockIds: new Set([headingBlockId]),
    includeDirectDefBlockIds: new Set([headingBlockId]),
  };

  const targets = resolveBacklinkTargetBlocks({
    backlinkBlockNode,
    curRootId,
    relatedDefBlockAndDocumentMap,
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0].id, headingBlockId);
  assert.equal(targets[0].type, "h");
  assert.equal(targets[0].subType, "h2");
  assert.equal(targets[0].content, "核心概念介绍");
  assert.equal(targets[0].rootId, curRootId);
});

test("resolveBacklinkTargetBlocks returns multiple target blocks when backlink has multiple references", () => {
  const curRootId = "doc-root-123";
  const blockAId = "block-a";
  const blockBId = "block-b";
  const relatedDefBlockAndDocumentMap = new Map([
    [blockAId, { id: blockAId, type: "p", content: "第一段内容", root_id: curRootId }],
    [blockBId, { id: blockBId, type: "i", content: "列表项条目", root_id: curRootId }],
  ]);
  const backlinkBlockNode = {
    includeCurBlockDefBlockIds: new Set([blockAId, blockBId]),
    includeDirectDefBlockIds: new Set([blockAId, blockBId]),
  };

  const targets = resolveBacklinkTargetBlocks({
    backlinkBlockNode,
    curRootId,
    relatedDefBlockAndDocumentMap,
  });

  assert.equal(targets.length, 2);
  assert.equal(targets[0].id, blockAId);
  assert.equal(targets[0].type, "p");
  assert.equal(targets[0].content, "第一段内容");
  assert.equal(targets[1].id, blockBId);
  assert.equal(targets[1].type, "i");
  assert.equal(targets[1].content, "列表项条目");
});

test("resolveBacklinkTargetBlocks fallbacks to document root when no target block IDs present", () => {
  const curRootId = "doc-root-123";
  const relatedDefBlockAndDocumentMap = new Map();
  const backlinkBlockNode = {
    includeCurBlockDefBlockIds: new Set(),
    includeDirectDefBlockIds: new Set(),
  };

  const targets = resolveBacklinkTargetBlocks({
    backlinkBlockNode,
    curRootId,
    relatedDefBlockAndDocumentMap,
    curDocTitle: "备用文档标题",
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0].id, curRootId);
  assert.equal(targets[0].type, "d");
  assert.equal(targets[0].content, "备用文档标题");
});

test("buildBacklinkTargetBlockItemHtml outputs target card with correct icon and attributes", () => {
  const html = buildBacklinkTargetBlockItemHtml({
    id: "block-1",
    rootId: "doc-1",
    type: "h",
    subType: "h2",
    content: "重要二级标题",
  });

  assert.match(html, /class="backlink-target-card/);
  assert.match(html, /data-target-block-id="block-1"/);
  assert.match(html, /data-target-root-id="doc-1"/);
  assert.match(html, /xlink:href="#iconH2"/);
  assert.match(html, /重要二级标题/);
});

test("buildBacklinkTargetSectionHtml renders connector arrow and target cards", () => {
  const html = buildBacklinkTargetSectionHtml([
    {
      id: "block-1",
      rootId: "doc-1",
      type: "p",
      content: "段落引用",
    },
  ], true);

  assert.match(html, /class="backlink-target-section"/);
  assert.match(html, /class="backlink-target-connector"/);
  assert.match(html, /xlink:href="#iconBlChevronDown"/);
  assert.match(html, /段落引用/);
});

test("buildBacklinkTargetSectionHtml returns empty string when showReferencedTargetBlock is false", () => {
  const html = buildBacklinkTargetSectionHtml([
    { id: "block-1", type: "p", content: "段落" },
  ], false);

  assert.equal(html, "");
});

test("updateBacklinkTargetSection updates container and binds click listeners", () => {
  const fakeCard = {
    getAttribute(attr) {
      if (attr === "data-target-block-id") return "target-block-99";
      if (attr === "data-target-root-id") return "root-doc-99";
      return null;
    },
    listeners: {},
    addEventListener(type, cb) {
      this.listeners[type] = cb;
    },
  };

  const targetContainer = {
    innerHTML: "",
    querySelectorAll(selector) {
      if (selector === ".backlink-target-card") {
        return [fakeCard];
      }
      return [];
    },
  };

  const documentLiElement = {
    nextElementSibling: {
      querySelector(selector) {
        if (selector === ".backlink-target-section-container") {
          return targetContainer;
        }
        return null;
      },
    },
  };

  let clickedArgs = null;
  const onTargetBlockClick = (event, blockId, rootId) => {
    clickedArgs = { blockId, rootId };
  };

  updateBacklinkTargetSection(
    documentLiElement,
    [{ id: "target-block-99", rootId: "root-doc-99", type: "p", content: "测试内容" }],
    true,
    onTargetBlockClick,
  );

  assert.match(targetContainer.innerHTML, /测试内容/);
  const card = targetContainer.querySelectorAll(".backlink-target-card")[0];
  assert.ok(card.listeners.click);
  card.listeners.click({});
  assert.deepEqual(clickedArgs, { blockId: "target-block-99", rootId: "root-doc-99" });
});

test("resolveSettingConfig includes showReferencedTargetBlock default false", () => {
  const config = resolveSettingConfig({});
  assert.equal(config.showReferencedTargetBlock, false);

  const customConfig = resolveSettingConfig({ showReferencedTargetBlock: true });
  assert.equal(customConfig.showReferencedTargetBlock, true);
});

import {
  findOpenedDocumentEditorElement,
  activateOpenedDocumentTab,
  navigateToOpenedDocumentBlock,
} from "../src/components/panel/backlink-document-open-target.js";
import { createBacklinkPanelOpenActions } from "../src/components/panel/backlink-panel-controller-open-actions.js";

test("findOpenedDocumentEditorElement finds open editor and ignores backlink panel preview protyles", () => {
  const insidePanelProtyle = {
    closest(selector) {
      if (selector === ".protyle") return insidePanelProtyle;
      if (selector === ".backlink-panel__area") return {};
      return null;
    },
  };
  const mainWorkspaceProtyle = {
    closest(selector) {
      if (selector === ".protyle") return mainWorkspaceProtyle;
      if (selector === ".backlink-panel__area") return null;
      return null;
    },
  };

  const documentRef = {
    querySelectorAll(selector) {
      if (selector.includes('data-node-id="doc-101"')) {
        return [
          {
            closest: (sel) => insidePanelProtyle.closest(sel),
          },
          {
            closest: (sel) => mainWorkspaceProtyle.closest(sel),
          },
        ];
      }
      return [];
    },
  };

  const editor = findOpenedDocumentEditorElement("doc-101", documentRef);
  assert.equal(editor, mainWorkspaceProtyle);
});

test("navigateToOpenedDocumentBlock scrolls to top and focuses title input when isDocument is true", () => {
  let scrolledTo = null;
  let titleFocused = false;
  let tabActivated = false;

  const editorElement = {
    getAttribute(attr) {
      if (attr === "data-id") return "tab-doc-1";
      return null;
    },
    querySelector(selector) {
      if (selector === ".protyle-content") {
        return {
          scrollTo(options) {
            scrolledTo = options;
          },
        };
      }
      if (selector === ".protyle-title__input") {
        return {
          focus() {
            titleFocused = true;
          },
        };
      }
      return null;
    },
    closest(sel) {
      if (sel === ".protyle") return editorElement;
      return null;
    },
  };

  const documentRef = {
    querySelectorAll(selector) {
      if (selector.includes('data-node-id="doc-1"')) {
        return [{ closest: (sel) => editorElement.closest(sel) }];
      }
      return [];
    },
    querySelector(selector) {
      if (selector === 'ul.layout-tab-bar > li.item[data-id="tab-doc-1"]') {
        return {
          classList: { contains: () => false },
          click() {
            tabActivated = true;
          },
        };
      }
      return null;
    },
  };

  const result = navigateToOpenedDocumentBlock({
    rootId: "doc-1",
    blockId: "doc-1",
    isDocument: true,
    documentRef,
  });

  assert.equal(result, true);
  assert.equal(tabActivated, true);
  assert.deepEqual(scrolledTo, { top: 0, behavior: "smooth" });
  assert.equal(titleFocused, true);
});

test("navigateToOpenedDocumentBlock scrolls into view and highlights specific target block", () => {
  let blockScrolled = false;
  const classListAdded = [];

  const targetBlockEl = {
    scrollIntoView(options) {
      blockScrolled = true;
    },
    classList: {
      add(cls) {
        classListAdded.push(cls);
      },
      remove() {},
    },
  };

  const editorElement = {
    getAttribute() {
      return "tab-doc-2";
    },
    querySelector(selector) {
      if (selector === '[data-node-id="block-head-1"]') {
        return targetBlockEl;
      }
      return null;
    },
    closest(sel) {
      if (sel === ".protyle") return editorElement;
      return null;
    },
  };

  const documentRef = {
    querySelectorAll(selector) {
      if (selector.includes('data-node-id="doc-2"')) {
        return [{ closest: (sel) => editorElement.closest(sel) }];
      }
      return [];
    },
    querySelector() {
      return { classList: { contains: () => true } };
    },
  };

  const result = navigateToOpenedDocumentBlock({
    rootId: "doc-2",
    blockId: "block-head-1",
    isDocument: false,
    documentRef,
  });

  assert.equal(result, true);
  assert.equal(blockScrolled, true);
  assert.ok(classListAdded.includes("protyle-wysiwyg--hl"));
});

test("handleTargetBlockClick marks isDocument correctly for document type and invokes openBlockTab", () => {
  const openBlockCalls = [];
  const openActions = createBacklinkPanelOpenActions({
    state: { rootId: "cur-doc-root" },
    openBlockTab: (rootId, blockId, options) => {
      openBlockCalls.push({ rootId, blockId, options });
    },
    resolveBacklinkDocumentOpenArea: (req) => req,
    getPreClickOpenArea: () => "focus",
    setPreClickOpenArea: () => {},
  });

  // 1. 点击文档类型目标块
  openActions.handleTargetBlockClick({}, "cur-doc-root", "cur-doc-root", "d");
  assert.deepEqual(openBlockCalls[0], {
    rootId: "cur-doc-root",
    blockId: "cur-doc-root",
    options: { openArea: "focus", isDocument: true },
  });

  // 2. 点击具体段落目标块
  openActions.handleTargetBlockClick({}, "para-123", "cur-doc-root", "p");
  assert.deepEqual(openBlockCalls[1], {
    rootId: "cur-doc-root",
    blockId: "para-123",
    options: { openArea: "focus", isDocument: false },
  });
});

test("navigateToOpenedDocumentBlock finds tab via window.siyuan.layout.center and calls protyle.scroll", () => {
  let switchTabCalled = false;
  let scrollBlockId = null;

  const fakeTab = {
    headElement: {
      getAttribute: () => "tab-id-999",
      closest: () => ({ classList: { contains: () => true } }),
    },
    parent: {
      switchTab(t) {
        switchTabCalled = true;
      },
    },
    model: {
      editor: {
        protyle: {
          block: { rootID: "doc-in-layout" },
          scroll(id, _pos, cb) {
            scrollBlockId = id;
            cb?.();
          },
        },
      },
    },
  };

  const windowRef = {
    siyuan: {
      layout: {
        center: {
          children: [
            {
              children: [fakeTab],
            },
          ],
        },
      },
    },
  };

  const result = navigateToOpenedDocumentBlock({
    rootId: "doc-in-layout",
    blockId: "block-target-in-virtual",
    isDocument: false,
    documentRef: { querySelectorAll: () => [] },
    windowRef,
  });

  assert.equal(result, true);
  assert.equal(switchTabCalled, true);
  assert.equal(scrollBlockId, "block-target-in-virtual");
});

test("updateBacklinkTargetSection immediately clears HTML when showReferencedTargetBlock changes to false and restores it when true", () => {
  const container = {
    innerHTML: "initial",
    querySelectorAll() {
      return [];
    },
  };
  const documentLiElement = {
    nextElementSibling: {
      querySelector(selector) {
        return selector === ".backlink-target-section-container" ? container : null;
      },
    },
  };

  const targetBlocks = [
    { id: "tb-1", type: "p", content: "Target Content" },
  ];

  // 1. 关闭显示：清空 innerHTML
  updateBacklinkTargetSection(documentLiElement, targetBlocks, false);
  assert.equal(container.innerHTML, "");

  // 2. 开启显示：恢复目标块卡片 HTML
  updateBacklinkTargetSection(documentLiElement, targetBlocks, true);
  assert.match(container.innerHTML, /class="backlink-target-section"/);
  assert.match(container.innerHTML, /Target Content/);
});

