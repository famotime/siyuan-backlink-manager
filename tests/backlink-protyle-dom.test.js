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

test("hideBlocksOutsideBacklinkSourceWindow unfolds folded ancestor list items for visible nested blocks", () => {
  const makeBlock = (id, dataType = "", folded = false) => ({
    id,
    parentElement: null,
    getAttribute(name) {
      if (name === "data-node-id") {
        return id;
      }
      if (name === "data-type") {
        return dataType;
      }
      if (name === "fold") {
        return folded ? "1" : null;
      }
      return null;
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
    removedAttributes: [],
    removeAttribute(name) {
      this.removedAttributes.push(name);
    },
  });

  const outerItem = makeBlock("item-outer", "NodeListItem", true);
  const nestedList = makeBlock("list-nested", "NodeList", false);
  const innerItem = makeBlock("item-inner", "NodeListItem", true);
  const childBlock = makeBlock("block-child", "NodeParagraph", false);
  nestedList.parentElement = outerItem;
  innerItem.parentElement = nestedList;
  childBlock.parentElement = innerItem;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [outerItem, nestedList, innerItem, childBlock];
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
        nearby: {
          windowBlockIds: ["block-child"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.ok(outerItem.removedAttributes.includes("fold"));
  assert.ok(innerItem.removedAttributes.includes("fold"));
});

test("hideBlocksOutsideBacklinkSourceWindow keeps descendant blocks visible when a list item container is in the window", () => {
  const makeBlock = (id) => ({
    id,
    parentElement: null,
    getAttribute(name) {
      return name === "data-node-id" ? id : null;
    },
    querySelectorAll() {
      return [];
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

  const itemBlock = makeBlock("item-a");
  const textBlock = makeBlock("block-a");
  const otherBlock = makeBlock("block-b");
  itemBlock.querySelectorAll = () => [textBlock];
  textBlock.parentElement = itemBlock;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemBlock, textBlock, otherBlock];
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
        nearby: {
          windowBlockIds: ["item-a"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(itemBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(textBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(otherBlock.classList.added, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow respects explicit visibleBlockIds without expanding every descendant of a shell block", () => {
  const makeBlock = (id) => ({
    id,
    parentElement: null,
    getAttribute(name) {
      return name === "data-node-id" ? id : null;
    },
    querySelectorAll() {
      return [];
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

  const itemShell = makeBlock("item-shell");
  const focusBlock = makeBlock("block-focus");
  const nestedList = makeBlock("list-nested");
  const nestedItem = makeBlock("item-nested");
  const nestedText = makeBlock("block-nested");
  focusBlock.parentElement = itemShell;
  nestedList.parentElement = itemShell;
  nestedItem.parentElement = nestedList;
  nestedText.parentElement = nestedItem;
  itemShell.querySelectorAll = () => [focusBlock, nestedList, nestedItem, nestedText];

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemShell, focusBlock, nestedList, nestedItem, nestedText];
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
          windowBlockIds: ["item-shell", "block-focus", "list-nested", "item-nested", "block-nested"],
          visibleBlockIds: ["item-shell", "block-focus"],
        },
      },
    },
    protyleContentElement,
    "core",
  );

  assert.deepEqual(itemShell.classList.removed, ["fn__none"]);
  assert.deepEqual(focusBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedList.classList.added, ["fn__none"]);
  assert.deepEqual(nestedItem.classList.added, ["fn__none"]);
  assert.deepEqual(nestedText.classList.added, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow prefers orderedVisibleBlockIds when provided", () => {
  const makeBlock = (id) => ({
    id,
    parentElement: null,
    getAttribute(name) {
      return name === "data-node-id" ? id : null;
    },
    querySelectorAll() {
      return [];
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
  const protyleWysiwygElement = {
    querySelectorAll() {
      return [blockA, blockB, blockC];
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
        nearby: {
          windowBlockIds: ["block-a", "block-b", "block-c"],
          visibleBlockIds: ["block-c", "block-a"],
          orderedVisibleBlockIds: ["block-a", "block-c"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(blockA.classList.removed, ["fn__none"]);
  assert.deepEqual(blockB.classList.added, ["fn__none"]);
  assert.deepEqual(blockC.classList.removed, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow keeps descendant child lists visible when a visible list item shell is unfolded", () => {
  const makeBlock = (id, dataType = "", folded = false) => ({
    id,
    parentElement: null,
    getAttribute(name) {
      if (name === "data-node-id") {
        return id;
      }
      if (name === "data-type") {
        return dataType;
      }
      if (name === "fold") {
        return folded ? "1" : null;
      }
      return null;
    },
    querySelectorAll() {
      return [];
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

  const itemShell = makeBlock("item-shell", "NodeListItem", false);
  const focusBlock = makeBlock("block-focus", "NodeParagraph", false);
  const nestedList = makeBlock("list-nested", "NodeList", false);
  const nestedItem = makeBlock("item-nested", "NodeListItem", false);
  const nestedText = makeBlock("block-nested", "NodeParagraph", false);
  focusBlock.parentElement = itemShell;
  nestedList.parentElement = itemShell;
  nestedItem.parentElement = nestedList;
  nestedText.parentElement = nestedItem;
  itemShell.querySelectorAll = () => [focusBlock, nestedList, nestedItem, nestedText];

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemShell, focusBlock, nestedList, nestedItem, nestedText];
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
          windowBlockIds: ["item-shell", "block-focus", "list-nested", "item-nested", "block-nested"],
          visibleBlockIds: ["item-shell", "block-focus"],
        },
      },
    },
    protyleContentElement,
    "core",
  );

  assert.deepEqual(itemShell.classList.removed, ["fn__none"]);
  assert.deepEqual(focusBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedList.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedItem.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedText.classList.removed, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow reveals descendants after unfolding a folded visible list item shell", () => {
  const makeBlock = (id, dataType = "", folded = false) => {
    let isFolded = folded;
    return {
      id,
      parentElement: null,
      getAttribute(name) {
        if (name === "data-node-id") {
          return id;
        }
        if (name === "data-type") {
          return dataType;
        }
        if (name === "fold") {
          return isFolded ? "1" : null;
        }
        return null;
      },
      querySelectorAll() {
        return [];
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
      removedAttributes: [],
      removeAttribute(name) {
        this.removedAttributes.push(name);
        if (name === "fold") {
          isFolded = false;
        }
      },
    };
  };

  const itemShell = makeBlock("item-shell", "NodeListItem", true);
  const focusBlock = makeBlock("block-focus", "NodeParagraph", false);
  const nestedList = makeBlock("list-nested", "NodeList", false);
  const nestedItem = makeBlock("item-nested", "NodeListItem", false);
  const nestedText = makeBlock("block-nested", "NodeParagraph", false);
  focusBlock.parentElement = itemShell;
  nestedList.parentElement = itemShell;
  nestedItem.parentElement = nestedList;
  nestedText.parentElement = nestedItem;
  itemShell.querySelectorAll = () => [focusBlock, nestedList, nestedItem, nestedText];

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemShell, focusBlock, nestedList, nestedItem, nestedText];
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
        nearby: {
          windowBlockIds: ["item-shell", "block-focus", "list-nested", "item-nested", "block-nested"],
          visibleBlockIds: ["item-shell", "block-focus"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.ok(itemShell.removedAttributes.includes("fold"));
  assert.deepEqual(itemShell.classList.removed, ["fn__none"]);
  assert.deepEqual(focusBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedList.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedItem.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedText.classList.removed, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow refreshes the DOM block snapshot after unfolding a folded visible shell", () => {
  const makeBlock = (id, dataType = "", folded = false) => {
    let isFolded = folded;
    return {
      id,
      parentElement: null,
      getAttribute(name) {
        if (name === "data-node-id") {
          return id;
        }
        if (name === "data-type") {
          return dataType;
        }
        if (name === "fold") {
          return isFolded ? "1" : null;
        }
        return null;
      },
      querySelectorAll() {
        return [];
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
      removeAttribute(name) {
        if (name === "fold") {
          isFolded = false;
        }
      },
    };
  };

  const itemShell = makeBlock("item-shell", "NodeListItem", true);
  const focusBlock = makeBlock("block-focus", "NodeParagraph", false);
  const neighborShell = makeBlock("item-neighbor", "NodeListItem", true);
  const neighborText = makeBlock("block-neighbor", "NodeParagraph", false);
  focusBlock.parentElement = itemShell;
  neighborText.parentElement = neighborShell;
  itemShell.querySelectorAll = () => (itemShell.getAttribute("fold") ? [] : [focusBlock]);
  neighborShell.querySelectorAll = () =>
    neighborShell.getAttribute("fold") ? [] : [neighborText];

  const protyleWysiwygElement = {
    querySelectorAll() {
      const visibleBlocks = [itemShell, neighborShell];
      if (!itemShell.getAttribute("fold")) {
        visibleBlocks.push(focusBlock);
      }
      if (!neighborShell.getAttribute("fold")) {
        visibleBlocks.push(neighborText);
      }
      return visibleBlocks;
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
        nearby: {
          windowBlockIds: ["item-shell", "block-focus", "item-neighbor", "block-neighbor"],
          visibleBlockIds: ["item-shell", "block-focus", "item-neighbor", "block-neighbor"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(focusBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(neighborText.classList.removed, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow keeps inline text descendants of visible list item shells even when their ids are not in the source window", () => {
  const makeBlock = (id, dataType = "") => ({
    id,
    parentElement: null,
    getAttribute(name) {
      if (name === "data-node-id") {
        return id;
      }
      if (name === "data-type") {
        return dataType;
      }
      if (name === "fold") {
        return null;
      }
      return null;
    },
    querySelectorAll() {
      return [];
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

  const itemShell = makeBlock("item-shell", "NodeListItem");
  const inlineText = makeBlock("inline-text", "NodeParagraph");
  const otherBlock = makeBlock("block-other", "NodeParagraph");
  inlineText.parentElement = itemShell;
  itemShell.querySelectorAll = () => [inlineText];

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemShell, inlineText, otherBlock];
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
        nearby: {
          windowBlockIds: ["item-shell"],
          visibleBlockIds: ["item-shell"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(itemShell.classList.removed, ["fn__none"]);
  assert.deepEqual(inlineText.classList.removed, ["fn__none"]);
  assert.deepEqual(otherBlock.classList.added, ["fn__none"]);
});
