export function buildBacklinkPaginationState({
  pageNum = 0,
  totalPage = 0,
} = {}) {
  const isVisible = totalPage > 0;

  return {
    isVisible,
    progressText: isVisible ? `${pageNum}/${totalPage}` : "",
    previousDisabled: !isVisible || pageNum <= 1,
    nextDisabled: !isVisible || pageNum >= totalPage,
  };
}

export function getBacklinkSummaryText(i18n = {}, documentCount = 0) {
  const template = i18n.findInBacklinkDocument || i18n.findInBacklink || "${x}";
  return template.replace("${x}", documentCount);
}
