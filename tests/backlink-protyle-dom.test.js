import test from "node:test";
import assert from "node:assert/strict";

import {
  expandBacklinkHeadingMore,
  foldListItemNodeByIdSet,
  hideBlocksOutsideBacklinkSourceWindow,
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

test("hideBlocksOutsideBacklinkSourceWindow keeps only blocks inside the current visibility window", () => {
  const makeBlock = (id) => ({
    id,
    getAttribute(name) {
      return name === "data-node-id" ? id : null;
    },
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
  const blockA = makeBlock("block-a");
  const blockB = makeBlock("block-b");
  const blockC = makeBlock("block-c");
  const protyleContentElement = {
    querySelector() {
      return {
        querySelectorAll() {
          return [blockA, blockB, blockC];
        },
      };
    },
  };

  hideBlocksOutsideBacklinkSourceWindow(
    {
      sourceWindows: {
        nearby: {
          windowBlockIds: ["block-b"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(blockA.classList.added, ["fn__none"]);
  assert.deepEqual(blockB.classList.removed, ["fn__none"]);
  assert.deepEqual(blockC.classList.added, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow keeps ancestor list containers visible for nested backlink blocks", () => {
  const makeBlock = (id) => ({
    id,
    parentElement: null,
    getAttribute(name) {
      return name === "data-node-id" ? id : null;
    },
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
  const outerItem = makeBlock("item-outer");
  const nestedList = makeBlock("list-nested");
  const innerItem = makeBlock("item-inner");
  const childBlock = makeBlock("block-child");
  const unrelatedBlock = makeBlock("block-other");
  nestedList.parentElement = outerItem;
  innerItem.parentElement = nestedList;
  childBlock.parentElement = innerItem;
  unrelatedBlock.parentElement = null;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [outerItem, nestedList, innerItem, childBlock, unrelatedBlock];
    },
  };
  const protyleContentElement = {
    querySelector() {
      return protyleWysiwygElement;
    },
  };

  hideBlocksOutsideBacklinkSourceWindow(
    {
      sourceWindows: {
        core: {
          windowBlockIds: ["block-child"],
        },
      },
    },
    protyleContentElement,
    "core",
  );

  assert.deepEqual(outerItem.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedList.classList.removed, ["fn__none"]);
  assert.deepEqual(innerItem.classList.removed, ["fn__none"]);
  assert.deepEqual(childBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(unrelatedBlock.classList.added, ["fn__none"]);
});
