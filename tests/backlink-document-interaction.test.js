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

test("keeps backlinkData restriction in the default preview mode", () => {
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
      contextVisibilityLevel: "nearby",
    }),
    {
      blockId: "doc-1",
      backlinkData: [activeBacklink],
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

test("uses assembled preview backlink data when nearby content is available", () => {
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
      contextVisibilityLevel: "nearby",
      deps: {
        buildBacklinkPreviewBacklinkData: () => [{ dom: "<div>assembled</div>" }],
      },
    }),
    {
      blockId: "doc-1",
      backlinkData: [{ dom: "<div>assembled</div>" }],
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
