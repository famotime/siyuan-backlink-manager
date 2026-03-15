import test from "node:test";
import assert from "node:assert/strict";

import * as backlinkDocumentInteraction from "../src/components/panel/backlink-document-interaction.js";

const {
  buildBacklinkDocumentRenderOptions,
  getBacklinkDocumentClickAction,
  getNextBacklinkContextVisibilityLevel,
  getPreviousBacklinkContextVisibilityLevel,
  getBacklinkDocumentTargetRole,
  shouldHandleBacklinkDocumentClick,
} = backlinkDocumentInteraction;

test("uses title click as a document open shortcut", () => {
  const action = getBacklinkDocumentClickAction({
    ctrlKey: false,
    targetRole: "title",
  });

  assert.equal(action, "open-block");
});

test("keeps fold toggle action on the left toggle button", () => {
  const action = getBacklinkDocumentClickAction({
    ctrlKey: false,
    targetRole: "toggle",
  });

  assert.equal(action, "toggle-fold");
});

test("treats svg children inside the left toggle button as toggle clicks", () => {
  const useElement = {
    closest(selector) {
      return selector === ".b3-list-item__toggle" ? {} : null;
    },
    classList: {
      contains() {
        return false;
      },
    },
  };
  const action = getBacklinkDocumentClickAction({
    ctrlKey: false,
    targetRole: getBacklinkDocumentTargetRole(useElement),
  });

  assert.equal(action, "toggle-fold");
});

test("ctrl-click still opens the backlink block directly", () => {
  const action = getBacklinkDocumentClickAction({
    ctrlKey: true,
    targetRole: "title",
  });

  assert.equal(action, "open-block");
});

test("ctrl-click on the title follows the current focus area", () => {
  const openArea =
    backlinkDocumentInteraction.getBacklinkDocumentOpenArea?.({
      trigger: "click",
      ctrlKey: true,
      targetRole: "title",
    }) ?? null;

  assert.equal(openArea, "focus");
});

test("left-click on the backlink document title opens the document in the main area", () => {
  const openArea =
    backlinkDocumentInteraction.getBacklinkDocumentOpenArea?.({
      trigger: "click",
      ctrlKey: false,
      targetRole: "title",
    }) ?? null;

  assert.equal(openArea, "main");
});

test("right-click on the backlink document title opens the document in the right area", () => {
  const openArea =
    backlinkDocumentInteraction.getBacklinkDocumentOpenArea?.({
      trigger: "contextmenu",
      ctrlKey: false,
      targetRole: "title",
    }) ?? null;

  assert.equal(openArea, "right");
});

test("returns the next document visibility level until full", () => {
  assert.equal(getNextBacklinkContextVisibilityLevel("core"), "nearby");
  assert.equal(getNextBacklinkContextVisibilityLevel("nearby"), "extended");
  assert.equal(getNextBacklinkContextVisibilityLevel("extended"), "full");
  assert.equal(getNextBacklinkContextVisibilityLevel("full"), "full");
});

test("returns the previous document visibility level until core", () => {
  assert.equal(getPreviousBacklinkContextVisibilityLevel("full"), "extended");
  assert.equal(getPreviousBacklinkContextVisibilityLevel("extended"), "nearby");
  assert.equal(getPreviousBacklinkContextVisibilityLevel("nearby"), "core");
  assert.equal(getPreviousBacklinkContextVisibilityLevel("core"), "core");
});

test("skips row-level handling when the click comes from the dedicated toggle button", () => {
  assert.equal(
    shouldHandleBacklinkDocumentClick({
      targetRole: "toggle",
    }),
    false,
  );
});

test("keeps row-level handling for title clicks", () => {
  assert.equal(
    shouldHandleBacklinkDocumentClick({
      targetRole: "title",
    }),
    true,
  );
});

test("omits backlinkData when rendering a full document", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-1",
      root_id: "doc-1",
      box: "box-1",
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "full",
    }),
    {
      blockId: "doc-1",
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});

test("uses source window scrollAttr for nearby mode when original context is available", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-1",
      root_id: "doc-1",
      box: "box-1",
    },
    sourceWindows: {
      nearby: {
        rootId: "doc-1",
        startBlockId: "block-prev",
        endBlockId: "block-next",
        focusBlockId: "backlink-1",
        anchorBlockId: "backlink-1",
      },
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "nearby",
    }),
    {
      blockId: "doc-1",
      scrollAttr: {
        rootId: "doc-1",
        startId: "block-prev",
        endId: "block-next",
        scrollTop: 0,
        focusId: "backlink-1",
        zoomInId: "backlink-1",
      },
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});

test("uses document rendering instead of scrollAttr for nearby mode when the source window spans sibling list items", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-child",
      root_id: "doc-1",
      box: "box-1",
    },
    sourceWindows: {
      nearby: {
        rootId: "doc-1",
        startBlockId: "block-prev",
        endBlockId: "block-next",
        focusBlockId: "backlink-child",
        anchorBlockId: "list-item-1",
      },
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "nearby",
    }),
    {
      blockId: "doc-1",
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});

test("uses preview backlink data instead of source window for reference-only backlinks", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-1",
      root_id: "doc-1",
      box: "box-1",
      markdown: "((20260221114249-31dbi9g \"“OpenClaw” 安装 ——Skills\"))",
    },
    contextBundle: {
      fragments: [
        {
          sourceType: "self",
          renderMarkdown:
            "((20260221114249-31dbi9g \"“OpenClaw” 安装 ——Skills\"))",
          visibilityLevel: "core",
        },
      ],
      previewSequence: {
        nearby: [
          {
            sequenceRole: "self",
            sourceType: "self",
            renderMarkdown:
              "((20260221114249-31dbi9g \"“OpenClaw” 安装 ——Skills\"))",
          },
        ],
      },
    },
    sourceWindows: {
      nearby: {
        rootId: "doc-1",
        startBlockId: "backlink-1",
        endBlockId: "backlink-1",
        focusBlockId: "backlink-1",
        anchorBlockId: "backlink-1",
      },
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "nearby",
      deps: {
        buildBacklinkPreviewBacklinkData: () => [{ dom: "<div>preview</div>" }],
      },
    }),
    {
      blockId: "doc-1",
      backlinkData: [{ dom: "<div>preview</div>" }],
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});

test("uses the original anchor block directly in core mode", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-1",
      root_id: "doc-1",
      box: "box-1",
    },
    sourceWindows: {
      core: {
        rootId: "doc-1",
        startBlockId: "backlink-1",
        endBlockId: "backlink-1",
        focusBlockId: "backlink-1",
        anchorBlockId: "backlink-1",
      },
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "core",
    }),
    {
      blockId: "backlink-1",
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});

test("uses source window scrollAttr in core mode when the source window anchor is a parent list item", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-child",
      root_id: "doc-1",
      box: "box-1",
    },
    sourceWindows: {
      core: {
        rootId: "doc-1",
        startBlockId: "list-item-1",
        endBlockId: "backlink-child",
        focusBlockId: "backlink-child",
        anchorBlockId: "list-item-1",
      },
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "core",
    }),
    {
      blockId: "doc-1",
      scrollAttr: {
        rootId: "doc-1",
        startId: "list-item-1",
        endId: "backlink-child",
        scrollTop: 0,
        focusId: "backlink-child",
        zoomInId: "list-item-1",
      },
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});

test("uses source window scrollAttr instead of preview backlink data in extended mode", () => {
  const activeBacklink = {
    backlinkBlock: {
      id: "backlink-1",
      root_id: "doc-1",
      box: "box-1",
    },
    sourceWindows: {
      extended: {
        rootId: "doc-1",
        startBlockId: "heading-1",
        endBlockId: "block-2",
        focusBlockId: "backlink-1",
        anchorBlockId: "backlink-1",
      },
    },
  };

  assert.deepEqual(
    buildBacklinkDocumentRenderOptions({
      documentId: "doc-1",
      activeBacklink,
      contextVisibilityLevel: "extended",
      deps: {
        buildBacklinkPreviewBacklinkData: () => [{ dom: "<div>assembled</div>" }],
      },
    }),
    {
      blockId: "doc-1",
      scrollAttr: {
        rootId: "doc-1",
        startId: "heading-1",
        endId: "block-2",
        scrollTop: 0,
        focusId: "backlink-1",
        zoomInId: "backlink-1",
      },
      render: {
        background: false,
        title: false,
        gutter: true,
        scroll: false,
        breadcrumb: false,
      },
    },
  );
});
