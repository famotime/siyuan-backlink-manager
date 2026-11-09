/**
 * 面包屑子域：从反链 blockPaths 构建标题层级面包屑（数据构建 + HTML 渲染）。
 * 与文档行渲染器（backlink-document-row.js）保持单向依赖，禁止反向引用。
 */
// 面包屑最大可见层级数：超过时折叠为「首级 › … › 末级」
const BACKLINK_BREADCRUMB_MAX_VISIBLE = 3;

function normalizeBacklinkBreadcrumbItemType(type = "") {
  const normalizedType = String(type || "").trim();
  if (!normalizedType) {
    return "";
  }

  const typeMap = {
    NodeDocument: "d",
    NodeHeading: "h",
    NodeList: "l",
    NodeListItem: "i",
    NodeParagraph: "p",
    NodeBlockquote: "b",
    NodeTable: "t",
    NodeCodeBlock: "c",
  };
  return typeMap[normalizedType] || normalizedType;
}

function createBacklinkBreadcrumbItem(blockPath = {}) {
  const label = String(blockPath?.name || "").trim();
  if (!label) {
    return null;
  }

  return {
    id: String(blockPath?.id || "").trim(),
    label,
    type: normalizeBacklinkBreadcrumbItemType(blockPath?.type),
    subType: String(blockPath?.subType || "").trim(),
    clickable: Boolean(String(blockPath?.id || "").trim()),
  };
}

function findBacklinkBreadcrumbTrail(
  blockPaths = [],
  targetBlockIdSet = new Set(),
) {
  for (const blockPath of blockPaths || []) {
    if (!blockPath) {
      continue;
    }

    const currentItem = createBacklinkBreadcrumbItem(blockPath);
    if (targetBlockIdSet.has(blockPath.id)) {
      return currentItem ? [currentItem] : [];
    }

    const childTrail = findBacklinkBreadcrumbTrail(
      blockPath.children || [],
      targetBlockIdSet,
    );
    if (childTrail) {
      return currentItem ? [currentItem, ...childTrail] : childTrail;
    }
  }

  return null;
}

function buildSingleBranchBreadcrumbTrail(blockPaths = []) {
  const breadcrumbItems = [];
  let currentLevel = blockPaths;

  while (Array.isArray(currentLevel) && currentLevel.length === 1) {
    const currentNode = currentLevel[0];
    const currentItem = createBacklinkBreadcrumbItem(currentNode);
    if (currentItem) {
      breadcrumbItems.push(currentItem);
    }
    currentLevel = currentNode?.children || [];
  }

  return breadcrumbItems;
}

function buildTopLevelBreadcrumbItems(blockPaths = []) {
  return (blockPaths || [])
    .map((blockPath) => createBacklinkBreadcrumbItem(blockPath))
    .filter(Boolean);
}

function buildFlatBacklinkBreadcrumbTrail(
  blockPaths = [],
  targetBlockIdSet = new Set(),
) {
  if (!Array.isArray(blockPaths) || blockPaths.length <= 0) {
    return null;
  }

  const targetIndex = blockPaths.findIndex((blockPath) =>
    targetBlockIdSet.has(blockPath?.id),
  );
  if (targetIndex < 0) {
    return null;
  }

  return blockPaths
    .slice(0, targetIndex + 1)
    .map((blockPath) => createBacklinkBreadcrumbItem(blockPath))
    .filter(Boolean);
}

function getBacklinkBreadcrumbTargetBlockIds(activeBacklink = null) {
  const targetBlockIdSet = new Set();
  const backlinkBlockId = String(activeBacklink?.backlinkBlock?.id || "").trim();
  if (backlinkBlockId) {
    targetBlockIdSet.add(backlinkBlockId);
  }
  return targetBlockIdSet;
}

function buildHeadingBreadcrumbItems(breadcrumbItems = []) {
  return (breadcrumbItems || []).filter((item) => item?.type === "h");
}

export function buildBacklinkBreadcrumbItems(activeBacklink = null) {
  const blockPaths = Array.isArray(activeBacklink?.blockPaths)
    ? activeBacklink.blockPaths
    : [];
  const targetBlockIdSet = getBacklinkBreadcrumbTargetBlockIds(activeBacklink);
  const matchedTrail = findBacklinkBreadcrumbTrail(blockPaths, targetBlockIdSet);
  if (Array.isArray(matchedTrail) && matchedTrail.length > 0) {
    const matchedHeadingTrail = buildHeadingBreadcrumbItems(matchedTrail);
    if (matchedHeadingTrail.length > 0) {
      return matchedHeadingTrail;
    }
  }

  const flatTrail = buildFlatBacklinkBreadcrumbTrail(blockPaths, targetBlockIdSet);
  if (Array.isArray(flatTrail) && flatTrail.length > 0) {
    const flatHeadingTrail = buildHeadingBreadcrumbItems(flatTrail);
    if (flatHeadingTrail.length > 0) {
      return flatHeadingTrail;
    }
  }

  const singleBranchTrail = buildSingleBranchBreadcrumbTrail(blockPaths);
  if (singleBranchTrail.length > 1) {
    return buildHeadingBreadcrumbItems(singleBranchTrail);
  }

  return buildHeadingBreadcrumbItems(buildTopLevelBreadcrumbItems(blockPaths));
}

/**
 * 面包屑层级折叠：超过 maxVisible 级时折叠为「首级 › … › 末级」，
 * 中间折叠部分渲染为不可点击的省略项
 */
export function collapseBacklinkBreadcrumbItems(
  breadcrumbItems = [],
  maxVisible = BACKLINK_BREADCRUMB_MAX_VISIBLE,
) {
  if (!Array.isArray(breadcrumbItems) || breadcrumbItems.length <= maxVisible) {
    return Array.isArray(breadcrumbItems) ? breadcrumbItems : [];
  }
  return [
    breadcrumbItems[0],
    { id: "", label: "…", clickable: false, ellipsis: true },
    breadcrumbItems[breadcrumbItems.length - 1],
  ];
}

/** 拼接面包屑完整路径文本，用于悬停 tooltip */
export function buildBacklinkBreadcrumbFullPath(breadcrumbItems = []) {
  return (breadcrumbItems || [])
    .map((item) => item?.label || "")
    .filter(Boolean)
    .join(" › ");
}

export function buildBacklinkBreadcrumbItemsHtml(breadcrumbItems = []) {
  const fullPath = buildBacklinkBreadcrumbFullPath(breadcrumbItems);
  const visibleItems = collapseBacklinkBreadcrumbItems(breadcrumbItems);
  const count = visibleItems.length;
  return visibleItems
    .map((item, index) => {
      const isLast = index === count - 1;
      const ellipsisClass = item.ellipsis
        ? " backlink-breadcrumb__item--ellipsis"
        : "";
      const clickableClass =
        item.clickable && !item.ellipsis
          ? " backlink-breadcrumb__item--clickable"
          : "";
      const currentClass = isLast
        ? " backlink-breadcrumb__item--current"
        : "";
      const nodeIdAttr =
        item.clickable && item.id ? ` data-node-id="${item.id}"` : "";
      // 末级悬停展示完整路径，弥补折叠后中间层级的信息缺失
      const ariaAttr =
        isLast && fullPath ? ` aria-label="${fullPath}" title="${fullPath}"` : "";
      return `<span class="protyle-breadcrumb__item backlink-breadcrumb__item${ellipsisClass}${clickableClass}${currentClass}"${nodeIdAttr}${ariaAttr}>${item.label}</span>`;
    })
    .join("");
}
