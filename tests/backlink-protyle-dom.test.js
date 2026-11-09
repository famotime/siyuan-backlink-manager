import test from "node:test";
import assert from "node:assert/strict";


import {
  expandBacklinkHeadingMore,
  foldListItemNodeByIdSet,
} from "../src/components/panel/backlink-protyle-dom.js";

test("foldListItemNodeByIdSet folds only requested list items after expanding all", () => {
  const folded = [];
  const unfolded = [];
  const foldable = {
    setAttribute(name, value) {
      folded.push([name, value]);
    },
  };
  const protyleWysiwygElement = {
    querySelector(selector) {
      return selector.includes("node-1") ? foldable : null;
    },
    querySelectorAll() {
      return [
        {
          removeAttribute(name) {
            unfolded.push(name);
          },
        },
      ];
    },
  };
  const element = {
    querySelector() {
      return protyleWysiwygElement;
    },
  };

  foldListItemNodeByIdSet(element, new Set(["node-1"]));

  assert.deepEqual(unfolded, ["fold"]);
  assert.deepEqual(folded, [["fold", "1"]]);
});

test("expandBacklinkHeadingMore reveals breadcrumb siblings before the bar and removes the more item", () => {
  const hiddenSibling = {
    classList: {
      removed: [],
      contains: () => false,
      remove(name) {
        this.removed.push(name);
      },
    },
    nextElementSibling: null,
  };
  const bar = {
    classList: {
      contains: (name) => name === "protyle-breadcrumb__bar",
    },
  };
  hiddenSibling.nextElementSibling = bar;
  const moreElement = {
    nextElementSibling: hiddenSibling,
    removed: false,
    remove() {
      this.removed = true;
    },
  };
  const element = {
    querySelector() {
      return {
        querySelector() {
          return moreElement;
        },
      };
    },
  };

  expandBacklinkHeadingMore(element);

  assert.deepEqual(hiddenSibling.classList.removed, ["fn__none"]);
  assert.equal(moreElement.removed, true);
});

