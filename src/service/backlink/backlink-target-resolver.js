/**
 * 解析反向链接引用的当前文档目标块列表
 * 当引用文档根时返回文档标题与文档类型，引用具体块时返回对应块类型与文本内容
 */

export function resolveBacklinkTargetBlocks({
  backlinkBlockNode = null,
  curRootId = "",
  relatedDefBlockAndDocumentMap = new Map(),
  curDocDefBlockArray = [],
  curDocTitle = "",
} = {}) {
  if (!curRootId && !backlinkBlockNode) {
    return [];
  }

  const directBlockIds = backlinkBlockNode?.includeDirectDefBlockIds;
  const curBlockIds = backlinkBlockNode?.includeCurBlockDefBlockIds;

  const candidateIdSet = new Set();

  if (directBlockIds && directBlockIds.size > 0) {
    for (const id of directBlockIds) {
      if (id === curRootId || (curBlockIds && curBlockIds.has(id))) {
        candidateIdSet.add(id);
      }
    }
  }

  if (candidateIdSet.size === 0 && curBlockIds && curBlockIds.size > 0) {
    for (const id of curBlockIds) {
      candidateIdSet.add(id);
    }
  }

  // 若无具体块引用，则默认指向当前文档自身
  if (candidateIdSet.size === 0 && curRootId) {
    candidateIdSet.add(curRootId);
  }

  const targetBlocks = [];
  const rootDocInfo = relatedDefBlockAndDocumentMap?.get?.(curRootId);
  const fallbackDocTitle = curDocTitle || rootDocInfo?.content || "";

  for (const blockId of candidateIdSet) {
    if (!blockId) {
      continue;
    }

    if (blockId === curRootId) {
      targetBlocks.push({
        id: curRootId,
        type: "d",
        subType: "",
        content: fallbackDocTitle || "文档",
        rootId: curRootId,
      });
      continue;
    }

    let blockInfo = relatedDefBlockAndDocumentMap?.get?.(blockId);
    if (!blockInfo && Array.isArray(curDocDefBlockArray)) {
      blockInfo = curDocDefBlockArray.find((b) => b?.id === blockId);
    }

    if (blockInfo) {
      targetBlocks.push({
        id: blockInfo.id || blockId,
        type: blockInfo.type || "p",
        subType: blockInfo.subtype || blockInfo.subType || "",
        content: blockInfo.content || "",
        rootId: blockInfo.root_id || curRootId,
      });
    } else {
      targetBlocks.push({
        id: blockId,
        type: "p",
        subType: "",
        content: "",
        rootId: curRootId,
      });
    }
  }

  return targetBlocks;
}
