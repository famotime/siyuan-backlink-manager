/**
 * 共享的 deps 大对象工厂。
 *
 * backlink-protyle-rendering.test.js 中 12 个 applyCreatedBacklinkProtyleState
 * 用例的 deps 对象近乎逐字重复，收敛为本工厂 + overrides 覆盖参数。
 * 默认值取自多数用例的原内联实现；个别键不同的用例通过 overrides 覆盖，
 * 未被生产代码消费的键（isSetEmpty/isSetNotEmpty/isArrayNotEmpty 在
 * applyCreatedBacklinkProtyleState 中未被解构）统一保留默认桩，不影响断言语义。
 */

/**
 * 构造 applyCreatedBacklinkProtyleState 的 deps 对象。
 *
 * @param {string[]} calls - 用例的调用记录数组，工厂内所有事件桩 push 到该数组
 * @param {object} [overrides] - 覆盖默认 deps 的键值（浅合并）
 * @returns {object} deps
 */
export function makeApplyCreatedProtyleDeps(calls, overrides = {}) {
  return {
    emitLoadedProtyleStatic: () => calls.push("emit"),
    // 多数用例为 isFolded: false；折叠用例通过 overrides 提供完整 renderState
    getBacklinkDocumentRenderState: () => ({ isFolded: false }),
    backlinkDocumentViewState: {},
    expandBacklinkDocument: () => calls.push("expand-document"),
    collapseBacklinkDocument: () => calls.push("collapse-document"),
    expandAllListItemNode: () => calls.push("expand-all-items"),
    expandBacklinkHeadingMore: () => calls.push("expand-heading"),
    backlinkProtyleItemFoldMap: new Map(),
    foldListItemNodeByIdSet: () => calls.push("fold-by-id-set"),
    hideBlocksOutsideBacklinkSourceWindow: () => calls.push("hide-window"),
    defaultExpandedListItemLevel: 1,
    expandListItemNodeByDepth: (_element, depth) =>
      calls.push(`expand-by-depth:${depth}`),
    getElementsBeforeDepth: () => [],
    getElementsAtDepth: () => [],
    syHasChildListNode: () => false,
    backlinkProtyleHeadingExpandMap: new Map(),
    queryParams: { backlinkKeywordStr: "" },
    isSetEmpty: () => true,
    isSetNotEmpty: () => false,
    isArrayNotEmpty: () => false,
    sanitizeBacklinkKeywords: () => [],
    splitKeywordStringToArray: () => [],
    highlightElementTextByCss: () => calls.push("highlight"),
    delayedTwiceRefresh: (callback) => callback(),
    ...overrides,
  };
}
