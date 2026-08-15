import { IBacklinkBlockQueryParams } from "@/models/backlink-model";
import { isArrayEmpty, isArrayNotEmpty } from "@/utils/array-util";
import { isStrBlank } from "@/utils/string-util";

export function generateGetDocHasBacklinksSql(rootId: string): string {
    if (!rootId) {
        return "";
    }
    return `SELECT count(1) AS count FROM refs WHERE def_block_root_id = '${rootId}' LIMIT 1;`;
}

export function generateGetParentDefBlockArraySql(
    queryParams: IBacklinkBlockQueryParams,
): string {
    let defBlockIds = queryParams.defBlockIds;
    let backlinkBlockIds = queryParams.backlinkBlockIds;

    let backlinkIdInSql = "";
    if (isArrayNotEmpty(backlinkBlockIds)) {
        backlinkIdInSql = generateAndInConditions("id", backlinkBlockIds);
    } else if (isArrayNotEmpty(defBlockIds)) {
        let defBlockIdInSql = generateAndInConditions("def_block_id", defBlockIds);
        backlinkIdInSql = `AND id IN ( SELECT block_id FROM refs WHERE 1 = 1 ${defBlockIdInSql} ) `;
    }
    if (isStrBlank(backlinkIdInSql)) {
        return "";
    }

    let sql = `
    WITH RECURSIVE parent_block AS (
    SELECT id, parent_id, name || alias || memo AS inAttrConcat, markdown, type, CAST (id AS TEXT) AS childIdPath 
    FROM  blocks 
    WHERE 1 = 1  ${backlinkIdInSql}
    UNION ALL 
    SELECT t.id, t.parent_id, t.name || t.alias || t.memo AS inAttrConcat, t.markdown, t.type, (p.childIdPath || '->' || t.id) AS childIdPath 
    FROM blocks t 
        INNER JOIN parent_block p ON t.id = p.parent_id
    WHERE t.type NOT IN ( 'd', 'c', 'm', 't', 'p', 'tb', 'html', 'video', 'audio', 'widget', 'iframe', 'query_embed' )
    ) 
    SELECT id, parent_id, type, childIdPath, inAttrConcat, markdown
    FROM parent_block 
    WHERE 1 == 1 
    AND type IN ( 'i', 'h', 'b', 's' )
    LIMIT 999999999;
    `;

    return cleanSpaceText(sql);
}

export function generateGetParenListItemtDefBlockArraySql(
    queryParams: IBacklinkBlockQueryParams,
): string {
    let backlinkParentBlockIds = queryParams.backlinkAllParentBlockIds;
    let idInSql = generateAndInConditions("sb.parent_id", backlinkParentBlockIds);

    let sql = `
    SELECT 	
        sb.parent_id,
        GROUP_CONCAT( sb.name || sb.alias || sb.memo || p.name || p.alias || p.memo ) AS inAttrConcat,
        GROUP_CONCAT( sb.markdown ) AS subMarkdown 
    FROM blocks sb LEFT JOIN blocks p on p.id = sb.parent_id
    WHERE 1 = 1 
        ${idInSql}
        AND sb.type NOT IN ('l', 'i') 
    GROUP BY sb.parent_id
    LIMIT 999999999;
    `;

    return cleanSpaceText(sql);
}

export function generateGetListItemtSubMarkdownArraySql(
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

export function generateGetBacklinkListItemBlockArraySql(
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
    SELECT b.*, 
    p1.type AS parentBlockType,
    p1.parent_id AS parentListItemParentId
    FROM blocks b
    LEFT JOIN blocks p1 ON b.parent_id = p1.id
    WHERE b.id IN ( 
        SELECT block_id 
        FROM refs 
        WHERE ${whereRefSql}
    )
    LIMIT 999999999;
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

export function generateGetHeadlineChildDefBlockArraySql(
    queryParams: IBacklinkBlockQueryParams,
): string {
    let defBlockIds = queryParams.defBlockIds;
    let backlinkBlockIds = queryParams.backlinkBlockIds;

    let backlinkIdInSql = "";
    if (isArrayNotEmpty(backlinkBlockIds)) {
        backlinkIdInSql = generateAndInConditions("id", backlinkBlockIds);
    } else if (isArrayNotEmpty(defBlockIds)) {
        let defBlockIdInSql = generateAndInConditions("def_block_id", defBlockIds);
        backlinkIdInSql = `AND id IN ( SELECT block_id FROM refs WHERE 1 = 1 ${defBlockIdInSql} ) `;
    }
    if (isStrBlank(backlinkIdInSql)) {
        return "";
    }

    let whereSql = ` AND type IN ( 'h', 'c', 'm', 't', 'p', 'html', 'av', 'video', 'audio', 'l', 's' )  `;

    let sql = `
    WITH RECURSIVE child_block AS (
        SELECT id, parent_id, (name || alias || memo) AS subInAttrConcat, markdown, type, CAST ( id AS TEXT ) AS parentIdPath 
        FROM blocks 
        WHERE 1 = 1 
            AND type = 'h'
            ${backlinkIdInSql}
    UNION ALL
        SELECT t.id, t.parent_id, (t.name || t.alias || t.memo) AS subInAttrConcat, t.markdown, t.type, ( c.parentIdPath || '->' || t.id ) AS parentIdPath 
        FROM blocks t
            INNER JOIN child_block c ON c.id = t.parent_id 
        WHERE t.type NOT IN ( 'd', 'i', 'tb', 'audio', 'widget', 'iframe', 'query_embed' ) 
        ) 
    SELECT * 
    FROM child_block 
    WHERE 1 == 1  ${whereSql} 
        LIMIT 999999999;
    `;
    return cleanSpaceText(sql);
}

export function generateGetListItemChildBlockArraySql(
    queryParams: IBacklinkBlockQueryParams,
): string {
    let defBlockIds = queryParams.defBlockIds;
    let backlinkBlockIds = queryParams.backlinkBlockIds;
    let parentBlockIds = queryParams.backlinkParentListItemBlockIds;

    let idInSql = "";
    if (isArrayNotEmpty(parentBlockIds)) {
        idInSql = generateAndInConditions("id", parentBlockIds);
    } else if (isArrayNotEmpty(backlinkBlockIds)) {
        let backlinkIdInSql = generateAndInConditions("id", backlinkBlockIds);
        idInSql = `AND id IN ( SELECT parent_id FROM blocks WHERE 1 = 1 ${backlinkIdInSql} ) `;
    } else if (isArrayNotEmpty(defBlockIds)) {
        let defBlockIdInSql = generateAndInConditions("def_block_id", defBlockIds);
        idInSql = `AND id IN ( SELECT parent_id FROM blocks WHERE 1 =1 AND id IN ( SELECT block_id FROM refs WHERE 1 = 1 ${defBlockIdInSql} ) )`;
    }
    if (isStrBlank(idInSql)) {
        return "";
    }

    let sql = `
    WITH RECURSIVE child_block AS (
        SELECT id,parent_id,type,CAST ( id AS TEXT ) AS parentIdPath 
        FROM blocks 
        WHERE 1 = 1 
            ${idInSql}
            AND type = 'i' 
    UNION ALL
        SELECT t.id,t.parent_id,t.type,( c.parentIdPath || '->' || t.id ) AS parentIdPath 
        FROM blocks t INNER JOIN child_block c ON c.id = t.parent_id 
    )
    SELECT * 
    FROM child_block 
    WHERE 1 == 1 AND type IN ( 'i' ) 
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

export function getParentIdIdxInfoSql() {
    let sql = `
    PRAGMA index_info(idx_blocks_parent_id_backlink_panel_plugin);
    `;
    return cleanSpaceText(sql);
}

export function getCreateBlocksParentIdIdxSql() {
    let sql = `
    CREATE INDEX idx_blocks_parent_id_backlink_panel_plugin ON blocks(parent_id);
    `;
    return cleanSpaceText(sql);
}

export function generateGetChildBlockArraySql(
    rootId: string,
    focusBlockId: string,
): string {
    let sql = `
    WITH RECURSIVE cte AS (
            SELECT *
            FROM blocks
            WHERE id = '${focusBlockId}' AND root_id = '${rootId}'
            UNION ALL
            SELECT t.*
            FROM blocks t
            INNER JOIN cte ON t.parent_id = cte.id
            WHERE t.root_id = '${rootId}'
            AND t.type NOT IN ( 'd', 'i', 'tb', 'audio', 'widget', 'iframe', 'query_embed' ) 
    )
    SELECT cte.*
    FROM cte
    LIMIT 999999999;
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
