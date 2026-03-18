import {
  getHeadlineChildBlockArray,
  getListItemChildBlockArray,
  getParentBlockArray,
} from "./backlink-query-loader-children.js";
import { getSiblingBlockGroupArray } from "./backlink-query-loader-siblings.js";

export {
  getHeadlineChildBlockArray,
  getListItemChildBlockArray,
  getParentBlockArray,
  getSiblingBlockGroupArray,
};

export async function getBacklinkBlockArray(queryParams, deps) {
  const {
    generateGetBacklinkListItemBlockArraySql,
    generateGetBacklinkBlockArraySql,
    sql,
  } = deps;

  if (!queryParams) {
    return [];
  }

  const query = queryParams.querrChildDefBlockForListItem
    ? generateGetBacklinkListItemBlockArraySql(queryParams)
    : generateGetBacklinkBlockArraySql(queryParams);
  return (await sql(query)) || [];
}

export async function getBlockInfoMap(blockIds, deps) {
  const { generateGetBlockArraySql, sql } = deps;
  const blockArray = (await sql(generateGetBlockArraySql(blockIds))) || [];
  const blockMap = new Map();
  for (const block of blockArray) {
    blockMap.set(block.id, block);
  }
  return blockMap;
}

export async function getBacklinkEmbedBlockInfo(
  backlinkBlock,
  curDocDefBlockArray,
  deps,
) {
  const {
    sql,
    generateGetChildBlockArraySql,
    getQueryStrByBlock,
    isArrayNotEmpty,
    isStrNotBlank,
  } = deps;

  let embedBlockmarkdown = "";
  const relatedDefBlockIdArray = [];

  for (const defBlock of curDocDefBlockArray) {
    if (
      !defBlock ||
      !isStrNotBlank(defBlock.backlinkBlockIdConcat) ||
      !defBlock.backlinkBlockIdConcat.includes(backlinkBlock.id)
    ) {
      continue;
    }

    relatedDefBlockIdArray.push(defBlock.id);
    embedBlockmarkdown += defBlock.markdown;
    let embedChildblockArray = null;

    if (defBlock.type === "d") {
      embedChildblockArray = await sql(
        `SELECT * FROM blocks WHERE root_id = '${defBlock.id}'`,
      );
    } else if (defBlock.type === "h") {
      embedChildblockArray = await sql(
        generateGetChildBlockArraySql(defBlock.root_id, defBlock.id),
      );
    } else if (defBlock.type === "query_embed") {
      embedChildblockArray = await sql(
        defBlock.markdown.replace("{{", "").replace("}}", ""),
      );
    }

    if (isArrayNotEmpty(embedChildblockArray)) {
      for (const block of embedChildblockArray) {
        embedBlockmarkdown += getQueryStrByBlock(block);
      }
    }
  }

  return { embedBlockmarkdown, relatedDefBlockIdArray };
}
