import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBacklinkDocumentRenderOptions,
  getBacklinkDocumentClickAction,
  getBacklinkDocumentTargetRole,
  shouldHandleBacklinkDocumentClick,
} from "../src/components/panel/backlink-document-interaction.js";

test("uses full-document action when left-clicking a backlink document title", () => {
  const action = getBacklinkDocumentClickAction({
    ctrlKey: false,
    targetRole: "title",
  });

  assert.equal(action, "show-full-document");
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
      showFullDocument: true,
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
      showFullDocument: false,
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
