import { IBacklinkBlockQueryParams } from "@/models/backlink-model";
import { isArrayEmpty, isArrayNotEmpty } from "@/utils/array-util";
import { isStrBlank } from "@/utils/string-util";

export function generateGetDocHasBacklinksSql(rootId: string): string {
    if (!rootId) {
        return "";
    }
    return `SELECT count(1) AS count FROM refs WHERE def_block_root_id = '${rootId}' LIMIT 1;`;
}


export function generateGetListItemSubMarkdownArraySql(
    listItemIdArray: string[],
): string {
    if (isArrayEmpty(listItemIdArray)) {
        return "";
    }
    let idInSql = generateAndInConditions("sb.parent_id", listItemIdArray);

    let sql = `
    SELECT sb.parent_id, GROUP_CONCAT( sb.markdown) AS subMarkdown ,
    GROUP_CONCAT( sb.name || sb.alias ||sb.memo ) AS subInAttrConcat,
	p.name || p.alias || p.memo AS parentInAttrConcat
    FROM blocks sb LEFT JOIN blocks p on p.id = sb.parent_id
    WHERE 1 = 1 
        ${idInSql}
        AND sb.type NOT IN ( 'l', 'i' ) 
    GROUP BY
        sb.parent_id 
        LIMIT 9999999999;
    `;

    return cleanSpaceText(sql);
}

export function generateGetBacklinkBlockArraySql(
    queryParams: IBacklinkBlockQueryParams,
): string {
    let rootId = queryParams.rootId;
    let defBlockIds = queryParams.defBlockIds;
    let whereRefSql = "";

    if (rootId) {
        whereRefSql = `def_block_root_id = '${rootId}'`;
    } else if (isArrayNotEmpty(defBlockIds)) {
        let idInSql = generateAndInConditions("def_block_id", defBlockIds);
        whereRefSql = `1 = 1 ${idInSql}`;
    }

    if (isStrBlank(whereRefSql)) {
        return "";
    }

    let sql = `
    SELECT b.*
    FROM blocks b
    WHERE b.id IN ( 
        SELECT block_id 
        FROM refs 
        WHERE ${whereRefSql}
    )
    LIMIT 9999999999;
    `;
    return cleanSpaceText(sql);
}

export function generateGetBacklinkSiblingBlockArraySql(
    queryParams: IBacklinkBlockQueryParams,
): string {
    let backlinkBlocks = queryParams.backlinkBlocks || [];
    let parentBlockIds = Array.from(
        new Set(
            backlinkBlocks
                .map(block =>
                    block?.parentBlockType === 'i'
                        ? block?.parentListItemParentId
                        : block?.parent_id,
                )
                .filter(parentId => !isStrBlank(parentId)),
        ),
    );
    let parentIdInSql = generateAndInConditions("parent_id", parentBlockIds);
    if (isStrBlank(parentIdInSql)) {
        return "";
    }

    let sql = `
    SELECT *
    FROM blocks
    WHERE 1 = 1
        ${parentIdInSql}
        AND type != 'd'
    LIMIT 999999999;
    `;

    return cleanSpaceText(sql);
}


export function generateGetBlockArraySql(
    blockIds: string[],
): string {
    let idInSql = generateAndInConditions("id", blockIds);

    let sql = `
    SELECT b.*
    FROM blocks b
    WHERE 1 = 1 
    ${idInSql}
    LIMIT 999999999;
    `;
    return cleanSpaceText(sql);
}

export function getCreateBlocksParentIdIdxSql() {
    let sql = `
    CREATE INDEX idx_blocks_parent_id_backlink_panel_plugin ON blocks(parent_id);
    `;
    return cleanSpaceText(sql);
}

function cleanSpaceText(inputText: string): string {
    let cleanedText = inputText.replace(/[\r\n]+/g, ' ');
    cleanedText = cleanedText.replace(/\s+/g, ' ');
    cleanedText = cleanedText.trim();
    return cleanedText;
}

function generateAndInConditions(
    fieldName: string,
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` AND ${fieldName} IN (`;
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";
    return result;
}
