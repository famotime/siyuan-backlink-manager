import test from "node:test";
import assert from "node:assert/strict";

import { shouldIgnoreDocumentBottomBacklinkForProtyle } from "../src/service/plugin/document-protyle-guard.js";

test("ignores protyle content rendered inside the backlink panel area", () => {
  const contentElement = {};
  const backlinkPanelArea = {};

  assert.equal(
    shouldIgnoreDocumentBottomBacklinkForProtyle(contentElement, {
      hasClosestByClassName: (element, className) =>
        element === contentElement && className === "backlink-panel__area"
          ? backlinkPanelArea
          : false,
    }),
    true,
  );
});

test("ignores protyle content rendered inside the document-bottom backlink area", () => {
  const contentElement = {};
  const documentBottomArea = {};

  assert.equal(
    shouldIgnoreDocumentBottomBacklinkForProtyle(contentElement, {
      hasClosestByClassName: (element, className) =>
        element === contentElement &&
        className === "backlink-panel-document-bottom__area"
          ? documentBottomArea
          : false,
    }),
    true,
  );
});

test("does not ignore normal document protyle content", () => {
  assert.equal(
    shouldIgnoreDocumentBottomBacklinkForProtyle({}, {
      hasClosestByClassName: () => false,
    }),
    false,
  );
});
