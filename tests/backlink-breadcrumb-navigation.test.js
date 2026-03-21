import test from "node:test";
import assert from "node:assert/strict";

import { navigateToBacklinkBreadcrumbBlock } from "../src/components/panel/backlink-protyle-dom.js";

test("navigateToBacklinkBreadcrumbBlock unfolds folded ancestors and scrolls the target into view", () => {
  const calls = [];
  const foldedListItem = {
    parentElement: null,
    getAttribute(name) {
      if (name === "data-type") {
        return "NodeListItem";
      }
      if (name === "fold") {
        return "1";
      }
      return null;
    },
    removeAttribute(name) {
      calls.push(["remove-attr", name]);
    },
    classList: {
      remove(name) {
        calls.push(["remove-class", "ancestor", name]);
      },
    },
  };
  const targetBlock = {
    parentElement: foldedListItem,
    getAttribute(name) {
      if (name === "data-node-id") {
        return "heading-1";
      }
      return null;
    },
    classList: {
      remove(name) {
        calls.push(["remove-class", "target", name]);
      },
    },
    scrollIntoView(options) {
      calls.push(["scroll", options]);
    },
  };
  const wysiwygElement = {
    querySelector(selector) {
      return selector.includes("heading-1") ? targetBlock : null;
    },
  };
  foldedListItem.parentElement = wysiwygElement;

  const navigated = navigateToBacklinkBreadcrumbBlock(
    {
      querySelector(selector) {
        if (selector === "div.protyle-wysiwyg.protyle-wysiwyg--attr") {
          return wysiwygElement;
        }
        return null;
      },
    },
    "heading-1",
  );

  assert.equal(navigated, true);
  assert.deepEqual(calls, [
    ["remove-class", "target", "fn__none"],
    ["remove-attr", "fold"],
    ["remove-class", "ancestor", "fn__none"],
    ["scroll", { block: "center", inline: "nearest" }],
  ]);
});

test("navigateToBacklinkBreadcrumbBlock scrolls to the preview top when the breadcrumb target is the document root", () => {
  const calls = [];
  const firstBlock = {
    parentElement: null,
    classList: {
      remove(name) {
        calls.push(["remove-class", name]);
      },
    },
    scrollIntoView(options) {
      calls.push(["scroll", options]);
    },
  };
  const wysiwygElement = {
    querySelector(selector) {
      if (selector === `[data-node-id="doc-a"]`) {
        return null;
      }
      if (selector === "[data-node-id]") {
        return firstBlock;
      }
      return null;
    },
  };
  firstBlock.parentElement = wysiwygElement;

  const navigated = navigateToBacklinkBreadcrumbBlock(
    {
      querySelector(selector) {
        if (selector === "div.protyle-wysiwyg.protyle-wysiwyg--attr") {
          return wysiwygElement;
        }
        return null;
      },
    },
    "doc-a",
    { documentId: "doc-a" },
  );

  assert.equal(navigated, true);
  assert.deepEqual(calls, [
    ["remove-class", "fn__none"],
    ["scroll", { block: "start", inline: "nearest" }],
  ]);
});
