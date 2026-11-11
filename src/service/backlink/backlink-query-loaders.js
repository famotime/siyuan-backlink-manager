import { getSiblingBlockGroupArray } from "./backlink-query-loader-siblings.js";

export { getSiblingBlockGroupArray };

export async function getBacklinkBlockArray(queryParams, deps) {
  const { generateGetBacklinkBlockArraySql, sql } = deps;

  if (!queryParams) {
    return [];
  }

  return (await sql(generateGetBacklinkBlockArraySql(queryParams))) || [];
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


