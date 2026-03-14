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

    backlinkBlockNode.parentMarkdown += markdown;
    updateDynamicAnchorMap(context.relatedDefBlockDynamicAnchorMap, markdown);
    updateStaticAnchorMap(context.relatedDefBlockStaticAnchorMap, markdown);
  }
}

function buildSiblingMarkdown(siblingBlock = {}) {
  return [
    siblingBlock.markdown || "",
    siblingBlock.name || "",
    siblingBlock.alias || "",
    siblingBlock.memo || "",
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

    backlinkBlockNode.previousSiblingMarkdown += appendSiblingBlockContext({
      siblingBlock: siblingGroup.previousSiblingBlock,
      backlinkBlockNode,
      relatedDefBlockIdSet,
      getRefBlockId,
      updateDynamicAnchorMap,
      updateStaticAnchorMap,
      updateMaxValueMap,
      updateMapCount,
      context,
    });
    backlinkBlockNode.nextSiblingMarkdown += appendSiblingBlockContext({
      siblingBlock: siblingGroup.nextSiblingBlock,
      backlinkBlockNode,
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
