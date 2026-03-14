import test from "node:test";
import assert from "node:assert/strict";

import {
  expandBacklinkHeadingMore,
  foldListItemNodeByIdSet,
  hideOtherListItemElement,
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

test("hideOtherListItemElement hides non-included children and excludes requested ones", () => {
  const makeItem = (id) => ({
    id,
    classList: {
      added: [],
      removed: [],
      add(name) {
        this.added.push(name);
      },
      remove(name) {
        this.removed.push(name);
      },
    },
  });
  const items = new Map([
    ["inc", makeItem("inc")],
    ["exc", makeItem("exc")],
    ["other", makeItem("other")],
  ]);
  const targetBlockParentElement = {
    matches: () => true,
    querySelectorAll() {
      return Array.from(items.values());
    },
    querySelector(selector) {
      const match = selector.match(/data-node-id="([^"]+)"/);
      return match ? items.get(match[1]) : null;
    },
  };
  const protyleContentElement = {
    querySelector() {
      return { parentElement: targetBlockParentElement };
    },
  };

  hideOtherListItemElement(
    {
      backlinkBlock: { id: "block-a" },
      includeChildListItemIdArray: ["inc"],
      excludeChildLisetItemIdArray: ["exc"],
    },
    protyleContentElement,
    {
      includeRelatedDefBlockIds: new Set(["def-a"]),
      excludeRelatedDefBlockIds: new Set(["def-b"]),
    },
    {
      isSetEmpty: (set) => !set || set.size === 0,
      isSetNotEmpty: (set) => set && set.size > 0,
      isArrayNotEmpty: (array) => Array.isArray(array) && array.length > 0,
    },
  );

  assert.deepEqual(items.get("other").classList.added, ["fn__none"]);
  assert.deepEqual(items.get("inc").classList.removed, ["fn__none"]);
  assert.deepEqual(items.get("exc").classList.added, ["fn__none", "fn__none"]);
});
