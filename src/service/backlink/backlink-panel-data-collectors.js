function trackRelatedDefBlockId({
  backlinkBlockNode,
  relatedDefBlockId,
  curDocDefBlockIdArray,
  created,
  updated,
  relatedDefBlockCountMap,
  backlinkBlockCreatedMap,
  backlinkBlockUpdatedMap,
  updateMaxValueMap,
  updateMapCount,
}) {
  backlinkBlockNode.includeRelatedDefBlockIds.add(relatedDefBlockId);
  backlinkBlockNode.includeCurBlockDefBlockIds?.add?.(relatedDefBlockId);

  if (curDocDefBlockIdArray.includes(relatedDefBlockId)) {
    backlinkBlockNode.includeDirectDefBlockIds.add(relatedDefBlockId);
    return;
  }

  updateMaxValueMap(backlinkBlockCreatedMap, relatedDefBlockId, created);
  updateMaxValueMap(backlinkBlockUpdatedMap, relatedDefBlockId, updated);
  updateMapCount(relatedDefBlockCountMap, relatedDefBlockId);
}

function trackRelatedDefBlockIdWithoutDuplicates({
  backlinkBlockNode,
  relatedDefBlockId,
  curDocDefBlockIdArray,
  relatedDefBlockIdSet,
  created,
  updated,
  relatedDefBlockCountMap,
  backlinkBlockCreatedMap,
  backlinkBlockUpdatedMap,
  updateMaxValueMap,
  updateMapCount,
}) {
  backlinkBlockNode.includeRelatedDefBlockIds.add(relatedDefBlockId);

  if (curDocDefBlockIdArray.includes(relatedDefBlockId)) {
    backlinkBlockNode.includeDirectDefBlockIds.add(relatedDefBlockId);
    return;
  }

  if (relatedDefBlockIdSet.has(relatedDefBlockId)) {
    return;
  }

  updateMaxValueMap(backlinkBlockCreatedMap, relatedDefBlockId, created);
  updateMaxValueMap(backlinkBlockUpdatedMap, relatedDefBlockId, updated);
  updateMapCount(relatedDefBlockCountMap, relatedDefBlockId);
}

export async function collectBacklinkBlocks({
  backlinkBlockArray = [],
  curDocDefBlockArray = [],
  getBacklinkEmbedBlockInfo,
  createBacklinkBlockNode,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  getRefBlockId,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  const { curDocDefBlockIdArray } = context;

  for (const backlinkBlock of backlinkBlockArray) {
    const backlinkBlockNode = createBacklinkBlockNode(backlinkBlock);
    const relatedDefBlockIdArray = [];

    if (backlinkBlock.type === "query_embed") {
      const result = await getBacklinkEmbedBlockInfo(
        backlinkBlock,
        curDocDefBlockArray,
      );
      backlinkBlock.markdown = result.embedBlockmarkdown;
      backlinkBlockNode.block.markdown = result.embedBlockmarkdown;
      relatedDefBlockIdArray.push(...result.relatedDefBlockIdArray);
    }

    const markdown = backlinkBlock.markdown;
    relatedDefBlockIdArray.push(...getRefBlockId(markdown));

    for (const relatedDefBlockId of relatedDefBlockIdArray) {
      trackRelatedDefBlockId({
        backlinkBlockNode,
        relatedDefBlockId,
        curDocDefBlockIdArray,
        created: backlinkBlock.created,
        updated: backlinkBlock.updated,
        relatedDefBlockCountMap: context.relatedDefBlockCountMap,
        backlinkBlockCreatedMap: context.backlinkBlockCreatedMap,
        backlinkBlockUpdatedMap: context.backlinkBlockUpdatedMap,
        updateMaxValueMap,
        updateMapCount,
      });
    }

    updateDynamicAnchorMap(backlinkBlockNode.dynamicAnchorMap, backlinkBlock.markdown);
    updateStaticAnchorMap(backlinkBlockNode.staticAnchorMap, backlinkBlock.markdown);

    updateMaxValueMap(
      context.backlinkBlockCreatedMap,
      backlinkBlock.root_id,
      backlinkBlock.created,
    );
    updateMaxValueMap(
      context.backlinkBlockUpdatedMap,
      backlinkBlock.root_id,
      backlinkBlock.updated,
    );
    updateMapCount(
      context.backlinkDocumentCountMap,
      backlinkBlock.root_id,
    );
    updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
    updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
    context.backlinkBlockMap[backlinkBlockNode.block.id] = backlinkBlockNode;
  }
}

export function collectHeadlineChildBlocks({
  headlinkBacklinkChildBlockArray = [],
  relatedDefBlockIdSet = new Set(),
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  for (const childBlock of headlinkBacklinkChildBlockArray) {
    let markdown = childBlock.markdown;
    const childDefBlockIdArray = getRefBlockId(markdown);
    markdown += childBlock.subInAttrConcat;
    const backlinkBlockId = childBlock.parentIdPath.split("->")[0];
    const backlinkBlockNode = context.backlinkBlockMap[backlinkBlockId];

    if (!backlinkBlockNode) {
      continue;
    }

    for (const childDefBlockId of childDefBlockIdArray) {
      trackRelatedDefBlockIdWithoutDuplicates({
        backlinkBlockNode,
        relatedDefBlockId: childDefBlockId,
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

    backlinkBlockNode.headlineChildMarkdown += markdown;
    updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
    updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
  }
}

export function collectListItemTreeNodes({
  listItemTreeNodeArray = [],
  getRefBlockId,
  updateDynamicAnchorMap,
  updateStaticAnchorMap,
  updateMaxValueMap,
  updateMapCount,
  context,
}) {
  for (const treeNode of listItemTreeNodeArray) {
    const listItemBlockId = treeNode.id;
    let backlinkBlockNode;

    for (const node of Object.values(context.backlinkBlockMap)) {
      if (node.block.parent_id === listItemBlockId) {
        backlinkBlockNode = node;
        break;
      }
    }

    if (!backlinkBlockNode) {
      continue;
    }

    backlinkBlockNode.parentListItemTreeNode = treeNode;
    const backlinkBlock = backlinkBlockNode.block;
    let markdown = treeNode.getAllMarkdown();
    markdown = markdown.replace(backlinkBlock.markdown, " ");
    const childDefBlockIdArray = getRefBlockId(markdown);

    for (const childDefBlockId of childDefBlockIdArray) {
      backlinkBlockNode.includeRelatedDefBlockIds.add(childDefBlockId);
      if (context.curDocDefBlockIdArray.includes(childDefBlockId)) {
        backlinkBlockNode.includeDirectDefBlockIds.add(childDefBlockId);
      } else {
        updateMaxValueMap(
          context.backlinkBlockCreatedMap,
          childDefBlockId,
          backlinkBlock.created,
        );
        updateMaxValueMap(
          context.backlinkBlockUpdatedMap,
          childDefBlockId,
          backlinkBlock.updated,
        );
        updateMapCount(context.relatedDefBlockCountMap, childDefBlockId);
      }
    }

    updateMaxValueMap(
      context.backlinkBlockCreatedMap,
      backlinkBlock.root_id,
      backlinkBlock.created,
    );
    updateMaxValueMap(
      context.backlinkBlockUpdatedMap,
      backlinkBlock.root_id,
      backlinkBlock.updated,
    );
    updateMapCount(context.backlinkDocumentCountMap, backlinkBlock.root_id);
    updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
    updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
  }
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
    updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
    updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
  }
}

function appendMarkdownSegment(baseMarkdown = "", nextMarkdown = "") {
  const compactNextMarkdown = String(nextMarkdown || "").trim();
  if (!compactNextMarkdown) {
    return baseMarkdown || "";
  }
  if (!baseMarkdown) {
    return compactNextMarkdown;
  }
  return `${baseMarkdown}\n\n${compactNextMarkdown}`;
}

function prependMarkdownSegment(baseMarkdown = "", nextMarkdown = "") {
  const compactNextMarkdown = String(nextMarkdown || "").trim();
  if (!compactNextMarkdown) {
    return baseMarkdown || "";
  }
  if (!baseMarkdown) {
    return compactNextMarkdown;
  }
  return `${compactNextMarkdown}\n\n${baseMarkdown}`;
}

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
