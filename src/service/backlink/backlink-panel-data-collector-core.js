import {
  trackRelatedDefBlockId,
} from "./backlink-panel-data-collector-helpers.js";

export async function collectBacklinkBlocks({
  backlinkBlockArray = [],
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
