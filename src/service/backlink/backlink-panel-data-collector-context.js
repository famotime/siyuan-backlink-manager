import {
  appendMarkdownSegment,
  prependBlockId,
  prependMarkdownSegment,
  trackRelatedDefBlockIdWithoutDuplicates,
} from "./backlink-panel-data-collector-helpers.js";

function getParentRenderMarkdown(parentBlock = {}) {
  if (parentBlock?.type === "i") {
    return extractFirstMarkdownLine(parentBlock.markdown || "");
  }
  return String(parentBlock?.markdown || "").trim();
}

function extractFirstMarkdownLine(markdown = "") {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function buildSiblingMarkdown(siblingBlock = {}) {
  const safeSiblingBlock = siblingBlock || {};
  if (safeSiblingBlock.type === "i") {
    return [
      safeSiblingBlock.markdown || "",
      safeSiblingBlock.subMarkdown || "",
      safeSiblingBlock.parentInAttrConcat || "",
      safeSiblingBlock.subInAttrConcat || "",
      safeSiblingBlock.name || "",
      safeSiblingBlock.alias || "",
      safeSiblingBlock.memo || "",
    ].join("");
  }

  return [
    safeSiblingBlock.markdown || "",
    safeSiblingBlock.name || "",
    safeSiblingBlock.alias || "",
    safeSiblingBlock.memo || "",
  ].join("");
}

function appendSiblingBlockContext({
  siblingBlock,
  backlinkBlockNode,
  relatedDefBlockIdSet,
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  const markdown = buildSiblingMarkdown(siblingBlock);
  if (!markdown) {
    return "";
  }

  const siblingDefBlockIdArray = getRefBlockId(markdown);
  for (const siblingDefBlockId of siblingDefBlockIdArray) {
    trackRelatedDefBlockIdWithoutDuplicates({
      backlinkBlockNode,
      relatedDefBlockId: siblingDefBlockId,
      curDocDefBlockIdArray: context.curDocDefBlockIdArray,
      relatedDefBlockIdSet,
      created: backlinkBlockNode.block.created,
      updated: backlinkBlockNode.block.updated,
      relatedDefBlockCountMap: context.relatedDefBlockCountMap,
      backlinkBlockCreatedMap: context.backlinkBlockCreatedMap,
      backlinkBlockUpdatedMap: context.backlinkBlockUpdatedMap,
      updateMaxValueMap,
      updateMapCount,
    });
  }

  updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
  updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
  return markdown;
}

function appendExpandedSiblingContext({
  siblingBlocks = [],
  backlinkBlockNode,
  relatedDefBlockIdSet,
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  let expandedMarkdown = "";
  let expandedRenderMarkdown = "";

  for (const siblingBlock of siblingBlocks) {
    const markdown = appendSiblingBlockContext({
      siblingBlock,
      backlinkBlockNode,
      relatedDefBlockIdSet,
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context,
    });
    expandedMarkdown = appendMarkdownSegment(expandedMarkdown, markdown);

    const renderMarkdown =
      siblingBlock?.renderMarkdown || siblingBlock?.markdown || markdown;
    expandedRenderMarkdown = appendMarkdownSegment(
      expandedRenderMarkdown,
      renderMarkdown,
    );
  }

  return { expandedMarkdown, expandedRenderMarkdown };
}

function applyExpandedSiblingContextToNode({
  backlinkBlockNode,
  siblingBlocks = [],
  markdownField,
  renderMarkdownField,
  relatedDefBlockIdSet,
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  const expandedSiblingContext = appendExpandedSiblingContext({
    siblingBlocks,
    backlinkBlockNode,
    relatedDefBlockIdSet,
    getRefBlockId,
    updateDynamicAnchorMap,
    updateStaticAnchorMap,
    updateMaxValueMap,
    updateMapCount,
    context,
  });
  backlinkBlockNode[markdownField] = appendMarkdownSegment(
    backlinkBlockNode[markdownField],
    expandedSiblingContext.expandedMarkdown,
  );
  backlinkBlockNode[renderMarkdownField] = appendMarkdownSegment(
    backlinkBlockNode[renderMarkdownField],
    expandedSiblingContext.expandedRenderMarkdown,
  );
}

export function collectParentBlocks({
  backlinkParentBlockArray = [],
  relatedDefBlockIdSet = new Set(),
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMapCount,
  context,
}) {
  for (const parentBlock of backlinkParentBlockArray) {
    let markdown = parentBlock.markdown;
    if (parentBlock.type === "i" && parentBlock.subMarkdown) {
      markdown = parentBlock.subMarkdown;
    }
    markdown += parentBlock.inAttrConcat;

    const parentDefBlockIdArray = getRefBlockId(markdown);
    const backlinkBlockId = parentBlock.childIdPath.split("->")[0];
    const backlinkBlockNode = context.backlinkBlockMap[backlinkBlockId];

    if (!backlinkBlockNode) {
      continue;
    }

    for (const parentDefBlockId of parentDefBlockIdArray) {
      backlinkBlockNode.includeRelatedDefBlockIds.add(parentDefBlockId);
      backlinkBlockNode.includeParentDefBlockIds.add(parentDefBlockId);

      if (context.curDocDefBlockIdArray.includes(parentDefBlockId)) {
        backlinkBlockNode.includeDirectDefBlockIds.add(parentDefBlockId);
      } else if (!relatedDefBlockIdSet.has(parentDefBlockId)) {
        updateMapCount(context.relatedDefBlockCountMap, parentDefBlockId);
      }
    }

    backlinkBlockNode.parentMarkdown = appendMarkdownSegment(
      backlinkBlockNode.parentMarkdown,
      markdown,
    );
    const parentRenderMarkdown = getParentRenderMarkdown(parentBlock);
    if (parentRenderMarkdown) {
      backlinkBlockNode.parentRenderMarkdown = prependMarkdownSegment(
        backlinkBlockNode.parentRenderMarkdown,
        parentRenderMarkdown,
      );
    }
    backlinkBlockNode.parentContextBlockIds = prependBlockId(
      backlinkBlockNode.parentContextBlockIds,
      parentBlock.id,
    );
    updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
    updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
  }
}

export function collectSiblingBlocks({
  backlinkSiblingBlockGroupArray = [],
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  const relatedDefBlockIdSet = new Set(context.relatedDefBlockCountMap.keys());

  for (const siblingGroup of backlinkSiblingBlockGroupArray) {
    const backlinkBlockNode = context.backlinkBlockMap[siblingGroup.backlinkBlockId];
    if (!backlinkBlockNode) {
      continue;
    }

    backlinkBlockNode.selfRenderMarkdown =
      siblingGroup.currentSiblingBlock?.renderMarkdown ||
      backlinkBlockNode.selfRenderMarkdown ||
      backlinkBlockNode.block?.markdown ||
      backlinkBlockNode.block?.content ||
      "";

    backlinkBlockNode.previousSiblingMarkdown = appendMarkdownSegment(
      backlinkBlockNode.previousSiblingMarkdown,
      appendSiblingBlockContext({
        siblingBlock: siblingGroup.previousSiblingBlock,
        backlinkBlockNode,
        relatedDefBlockIdSet,
        getRefBlockId,
        updateDynamicAnchorMap,
        updateStaticAnchorMap,
        updateMaxValueMap,
        updateMapCount,
        context,
      }),
    );
    backlinkBlockNode.previousSiblingRenderMarkdown =
      siblingGroup.previousSiblingBlock?.renderMarkdown || "";
    backlinkBlockNode.previousSiblingBlockId =
      siblingGroup.previousSiblingBlock?.id || "";
    backlinkBlockNode.nextSiblingMarkdown = appendMarkdownSegment(
      backlinkBlockNode.nextSiblingMarkdown,
      appendSiblingBlockContext({
        siblingBlock: siblingGroup.nextSiblingBlock,
        backlinkBlockNode,
        relatedDefBlockIdSet,
        getRefBlockId,
        updateDynamicAnchorMap,
        updateStaticAnchorMap,
        updateMaxValueMap,
        updateMapCount,
        context,
      }),
    );
    backlinkBlockNode.nextSiblingRenderMarkdown =
      siblingGroup.nextSiblingBlock?.renderMarkdown || "";
    backlinkBlockNode.nextSiblingBlockId =
      siblingGroup.nextSiblingBlock?.id || "";
    applyExpandedSiblingContextToNode({
      backlinkBlockNode,
      siblingBlocks: siblingGroup.beforeSiblingBlocks || [],
      markdownField: "beforeExpandedMarkdown",
      renderMarkdownField: "beforeExpandedRenderMarkdown",
      relatedDefBlockIdSet,
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context,
    });
    backlinkBlockNode.beforeExpandedBlockIdArray = (
      siblingGroup.beforeSiblingBlocks || []
    )
      .map((block) => block?.id)
      .filter(Boolean);
    applyExpandedSiblingContextToNode({
      backlinkBlockNode,
      siblingBlocks: siblingGroup.afterSiblingBlocks || [],
      markdownField: "afterExpandedMarkdown",
      renderMarkdownField: "afterExpandedRenderMarkdown",
      relatedDefBlockIdSet,
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context,
    });
    backlinkBlockNode.afterExpandedBlockIdArray = (
      siblingGroup.afterSiblingBlocks || []
    )
      .map((block) => block?.id)
      .filter(Boolean);
    applyExpandedSiblingContextToNode({
      backlinkBlockNode,
      siblingBlocks: siblingGroup.expandedSiblingBlocks || [],
      markdownField: "expandedMarkdown",
      renderMarkdownField: "expandedRenderMarkdown",
      relatedDefBlockIdSet,
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context,
    });
  }
}
