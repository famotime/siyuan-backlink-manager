import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  hideBlocksOutsideBacklinkSourceWindow,
} from "../src/components/panel/backlink-protyle-visibility.js";
import {
  makeProtyleBlock,
  makeProtyleContentElement,
} from "./helpers/dom-mocks.js";

test("hideBlocksOutsideBacklinkSourceWindow keeps only blocks inside the current visibility window", () => {
  const blockA = makeProtyleBlock("block-a");
  const blockB = makeProtyleBlock("block-b");
  const blockC = makeProtyleBlock("block-c");
  const protyleWysiwygElement = {
    querySelectorAll() {
      return [blockA, blockB, blockC];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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
  const outerItem = makeProtyleBlock("item-outer");
  const nestedList = makeProtyleBlock("list-nested");
  const innerItem = makeProtyleBlock("item-inner");
  const childBlock = makeProtyleBlock("block-child");
  const unrelatedBlock = makeProtyleBlock("block-other");
  nestedList.parentElement = outerItem;
  innerItem.parentElement = nestedList;
  childBlock.parentElement = innerItem;
  unrelatedBlock.parentElement = null;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [outerItem, nestedList, innerItem, childBlock, unrelatedBlock];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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
  const outerItem = makeProtyleBlock("item-outer", { dataType: "NodeListItem", folded: true });
  const nestedList = makeProtyleBlock("list-nested", { dataType: "NodeList" });
  const innerItem = makeProtyleBlock("item-inner", { dataType: "NodeListItem", folded: true });
  const childBlock = makeProtyleBlock("block-child", { dataType: "NodeParagraph" });
  nestedList.parentElement = outerItem;
  innerItem.parentElement = nestedList;
  childBlock.parentElement = innerItem;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [outerItem, nestedList, innerItem, childBlock];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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

test("hideBlocksOutsideBacklinkSourceWindow keeps descendant blocks visible only when they are part of the source window", () => {
  const textBlock = makeProtyleBlock("block-a", { dataType: "NodeParagraph" });
  const itemBlock = makeProtyleBlock("item-a", { dataType: "NodeListItem" });
  const otherBlock = makeProtyleBlock("block-b", { dataType: "NodeParagraph" });
  itemBlock.querySelectorAll = () => [textBlock];
  textBlock.parentElement = itemBlock;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemBlock, textBlock, otherBlock];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

  hideBlocksOutsideBacklinkSourceWindow(
    {
      sourceWindows: {
        nearby: {
          windowBlockIds: ["item-a", "block-a"],
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

test("hideBlocksOutsideBacklinkSourceWindow does not bring back list descendants that are outside the source window", () => {
  const textBlock = makeProtyleBlock("block-a", { dataType: "NodeParagraph" });
  const nestedTextBlock = makeProtyleBlock("block-b", { dataType: "NodeParagraph" });
  const itemBlock = makeProtyleBlock("item-a", { dataType: "NodeListItem" });
  itemBlock.querySelectorAll = () => [textBlock, nestedTextBlock];
  textBlock.parentElement = itemBlock;
  nestedTextBlock.parentElement = itemBlock;

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemBlock, textBlock, nestedTextBlock];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

  hideBlocksOutsideBacklinkSourceWindow(
    {
      sourceWindows: {
        nearby: {
          windowBlockIds: ["item-a", "block-a"],
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(itemBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(textBlock.classList.removed, ["fn__none"]);
  assert.deepEqual(nestedTextBlock.classList.added, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow keeps the full continuous window visible even when legacy visibleBlockIds are narrower", () => {
  const itemShell = makeProtyleBlock("item-shell");
  const focusBlock = makeProtyleBlock("block-focus");
  const nestedList = makeProtyleBlock("list-nested");
  const nestedItem = makeProtyleBlock("item-nested");
  const nestedText = makeProtyleBlock("block-nested");
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
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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

test("hideBlocksOutsideBacklinkSourceWindow keeps all blocks in the bodyRange visible even when orderedVisibleBlockIds are narrower", () => {
  const blockA = makeProtyleBlock("block-a");
  const blockB = makeProtyleBlock("block-b");
  const blockC = makeProtyleBlock("block-c");
  const protyleWysiwygElement = {
    querySelectorAll() {
      return [blockA, blockB, blockC];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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
  assert.deepEqual(blockB.classList.removed, ["fn__none"]);
  assert.deepEqual(blockC.classList.removed, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow reads the full bodyRange from contextPlan without hiding middle blocks", () => {
  const blockA = makeProtyleBlock("block-a");
  const blockB = makeProtyleBlock("block-b");
  const blockC = makeProtyleBlock("block-c");
  const protyleWysiwygElement = {
    querySelectorAll() {
      return [blockA, blockB, blockC];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

  hideBlocksOutsideBacklinkSourceWindow(
    {
      sourceWindows: {
        nearby: {
          contextPlan: {
            bodyRange: {
              windowBlockIds: ["block-a", "block-b", "block-c"],
            },
            orderedVisibleBlockIds: ["block-a", "block-c"],
          },
        },
      },
    },
    protyleContentElement,
    "nearby",
  );

  assert.deepEqual(blockA.classList.removed, ["fn__none"]);
  assert.deepEqual(blockB.classList.removed, ["fn__none"]);
  assert.deepEqual(blockC.classList.removed, ["fn__none"]);
});

test("hideBlocksOutsideBacklinkSourceWindow does not hide continuous window blocks even when collapsedBlockIds are present in legacy data", () => {
  const itemShell = makeProtyleBlock("item-shell");
  const focusBlock = makeProtyleBlock("block-focus");
  const nestedList = makeProtyleBlock("list-nested");
  const nestedItem = makeProtyleBlock("item-nested");
  const nestedText = makeProtyleBlock("block-nested");
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
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

  hideBlocksOutsideBacklinkSourceWindow(
    {
      sourceWindows: {
        core: {
          contextPlan: {
            bodyRange: {
              windowBlockIds: [
                "item-shell",
                "block-focus",
                "list-nested",
                "item-nested",
                "block-nested",
              ],
            },
            orderedVisibleBlockIds: ["item-shell", "block-focus"],
            collapsedBlockIds: ["list-nested", "item-nested", "block-nested"],
          },
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

test("hideBlocksOutsideBacklinkSourceWindow keeps descendant child lists visible when a visible list item shell is unfolded", () => {
  const itemShell = makeProtyleBlock("item-shell", { dataType: "NodeListItem" });
  const focusBlock = makeProtyleBlock("block-focus", { dataType: "NodeParagraph" });
  const nestedList = makeProtyleBlock("list-nested", { dataType: "NodeList" });
  const nestedItem = makeProtyleBlock("item-nested", { dataType: "NodeListItem" });
  const nestedText = makeProtyleBlock("block-nested", { dataType: "NodeParagraph" });
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
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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
  const itemShell = makeProtyleBlock("item-shell", { dataType: "NodeListItem", folded: true });
  const focusBlock = makeProtyleBlock("block-focus", { dataType: "NodeParagraph" });
  const nestedList = makeProtyleBlock("list-nested", { dataType: "NodeList" });
  const nestedItem = makeProtyleBlock("item-nested", { dataType: "NodeListItem" });
  const nestedText = makeProtyleBlock("block-nested", { dataType: "NodeParagraph" });
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
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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
  const focusBlock = makeProtyleBlock("block-focus", { dataType: "NodeParagraph", folded: true });
  const itemShell = makeProtyleBlock("item-shell", { dataType: "NodeListItem", folded: true });
  const neighborText = makeProtyleBlock("block-neighbor", { dataType: "NodeParagraph" });
  const neighborShell = makeProtyleBlock("item-neighbor", { dataType: "NodeListItem", folded: true });
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
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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

test("hideBlocksOutsideBacklinkSourceWindow does not keep inline text descendants when their ids are outside the source window", () => {
  const inlineText = makeProtyleBlock("inline-text", { dataType: "NodeParagraph" });
  const itemShell = makeProtyleBlock("item-shell", { dataType: "NodeListItem" });
  const otherBlock = makeProtyleBlock("block-other", { dataType: "NodeParagraph" });
  inlineText.parentElement = itemShell;
  itemShell.querySelectorAll = () => [inlineText];

  const protyleWysiwygElement = {
    querySelectorAll() {
      return [itemShell, inlineText, otherBlock];
    },
  };
  const protyleContentElement = makeProtyleContentElement(protyleWysiwygElement);

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
  assert.deepEqual(inlineText.classList.added, ["fn__none"]);
  assert.deepEqual(otherBlock.classList.added, ["fn__none"]);
});
test("backlink protyle visibility module reads source window semantics through getters only", () => {
  const source = readFileSync(
    new URL("../src/components/panel/backlink-protyle-visibility.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /getBacklinkSourceWindowBodyRange/);
  assert.match(source, /getBacklinkSourceWindowByLevel/);
  assert.doesNotMatch(source, /sourceWindow\.(windowBlockIds|visibleBlockIds|orderedVisibleBlockIds|collapsedBlockIds)\b/);
});
