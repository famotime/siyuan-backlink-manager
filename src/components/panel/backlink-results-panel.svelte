<script lang="ts">
    import { EnvConfig } from "@/config/EnvConfig";
    import {
        BACKLINK_BLOCK_SORT_METHOD_ELEMENT,
    } from "@/models/backlink-constant";
    import { isArrayNotEmpty } from "@/utils/array-util";
    import { renderIcon } from "@/utils/svg-icon";
    import {
        BACKLINK_CONTEXT_LEVEL_ORDER,
        getBacklinkContextLevelLabel,
        getBacklinkContextLevelTooltip,
        getBacklinkSummaryText,
    } from "./backlink-panel-header.js";

    export let panelBacklinkViewExpand = true;
    export let queryParams;
    export let backlinkFilterPanelRenderData;
    export let displayHintBacklinkBlockCacheUsage = false;
    export let hideBacklinkProtyleBreadcrumb = false;
    export let backlinkGlobalContextVisibilityLevel = "core";
    export let backlinkULElement;
    export let resetBacklinkQueryParametersToDefault;
    export let refreshBacklinkPanelToCurrentMainDocument;
    export let updateRenderData;
    export let handleBacklinkKeywordInput;
    export let setAllBacklinkDocumentContextVisibilityLevel;
    export let stepAllBacklinkDocumentContextVisibilityLevel;
    export let expandAllBacklinkDocument;
    export let expandAllBacklinkListItemNode;
    export let collapseAllBacklinkDocument;
    export let collapseAllBacklinkListItemNode;

    let isAllExpanded = true;

    $: if (backlinkFilterPanelRenderData) {
        isAllExpanded = true;
    }

    function toggleAllBacklinkDocuments() {
        if (isAllExpanded) {
            collapseAllBacklinkDocument?.();
            isAllExpanded = false;
        } else {
            expandAllBacklinkDocument?.();
            isAllExpanded = true;
        }
    }

    function handleToggleContextMenu(event) {
        event.preventDefault();
        if (isAllExpanded) {
            collapseAllBacklinkListItemNode?.();
        } else {
            expandAllBacklinkListItemNode?.();
        }
    }

    function clearKeywordSearch() {
        if (queryParams) {
            queryParams.backlinkKeywordStr = "";
            updateRenderData?.();
        }
    }

    function handleKeyDownDefault() {}
</script>

<div class="backlink-panel__header backlink-results-panel__header">
    <div
        class="panel__title backlink-panel__title block__icons"
        on:click={() => {
            panelBacklinkViewExpand = !panelBacklinkViewExpand;
        }}
        on:keydown={handleKeyDownDefault}
    >
        <div class="block__logo fn__flex-center" style="font-weight: bold;">
            <span class="block__logoicon b3-icon--wireframe">{@html renderIcon("iconBlPanelLogo", 16)}</span>
            <span style="margin-left: 6px;">反链管家</span>
        </div>
        <span class="fn__flex-1"></span>
        <button
            type="button"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="刷新反链"
            on:click|stopPropagation={refreshBacklinkPanelToCurrentMainDocument}
            on:keydown={handleKeyDownDefault}
        >
            {@html renderIcon("iconBlRefresh")}
        </button>
        <button
            type="button"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="恢复默认设置与筛选条件"
            on:click|stopPropagation={resetBacklinkQueryParametersToDefault}
            on:keydown={handleKeyDownDefault}
        >
            {@html renderIcon("iconResetInitialization")}
        </button>
        {#if panelBacklinkViewExpand}
            <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠面板">
                {@html renderIcon("iconBlChevronUp")}
            </span>
        {:else}
            <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label="展开面板">
                {@html renderIcon("iconBlChevronDown")}
            </span>
        {/if}
    </div>
    {#if panelBacklinkViewExpand && queryParams}
        <div class="backlink-toolbar-row">
            <div class="backlink-search-input-wrap">
                <span class="backlink-search-icon">{@html renderIcon("iconBlSearch", 13)}</span>
                <input
                    class="b3-text-field backlink-search-input"
                    placeholder={EnvConfig.ins.i18n.searchPlaceholder ||
                        "搜索关键词，空格分隔多词"}
                    on:input={handleBacklinkKeywordInput}
                    bind:value={queryParams.backlinkKeywordStr}
                />
                {#if queryParams.backlinkKeywordStr}
                    <button
                        type="button"
                        class="backlink-search-clear b3-tooltips b3-tooltips__s"
                        aria-label="清空搜索内容"
                        on:click={clearKeywordSearch}
                    >
                        {@html renderIcon("iconBlClear", 12)}
                    </button>
                {/if}
            </div>
            <div class="backlink-toolbar-actions">
                <span class="backlink-sort-icon">{@html renderIcon("iconContentSort", 14)}</span>
                <select
                    class="b3-select fn__flex-center backlink-sort-select"
                    bind:value={queryParams.backlinkBlockSortMethod}
                    on:change={updateRenderData}
                >
                    {#each BACKLINK_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value == queryParams.backlinkBlockSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <button
                    type="button"
                    class="block__icon b3-tooltips b3-tooltips__sw"
                    aria-label={isAllExpanded ? "折叠所有文档" : "展开所有文档"}
                    title={isAllExpanded ? "右键：折叠列表项节点" : "右键：展开列表项节点"}
                    on:click={toggleAllBacklinkDocuments}
                    on:contextmenu={handleToggleContextMenu}
                    on:keydown={handleKeyDownDefault}
                >
                    {#if isAllExpanded}
                        {@html renderIcon("iconBlCollapseAll")}
                    {:else}
                        {@html renderIcon("iconBlExpandAll")}
                    {/if}
                </button>
            </div>
        </div>
    {/if}
    {#if panelBacklinkViewExpand && backlinkFilterPanelRenderData && isArrayNotEmpty(backlinkFilterPanelRenderData.backlinkDataArray)}
        <div class="block__icons backlink-results-summary-row">
            <span
                class="fn__flex-shrink ft__selectnone b3-tooltips b3-tooltips__s backlink-results-summary-text"
                aria-label={(EnvConfig.ins.i18n.backlinkSummaryTooltip ||
                    "当前文档被 ${x} 篇文档引用").replace(
                        "${x}",
                        backlinkFilterPanelRenderData.backlinkDocumentCount,
                    )}
            >
                {getBacklinkSummaryText(
                    EnvConfig.ins.i18n,
                    backlinkFilterPanelRenderData.backlinkDocumentCount,
                )}
            </span>
        </div>
        <div class="block__icons backlink-results-global-context-row">
            <span class="backlink-context-global-label">{EnvConfig.ins.i18n.globalContextPrefix || "全局"}</span>
            <div class="backlink-context-control-row backlink-context-control-row--global">
                <button
                    type="button"
                    class="block__icon ariaLabel backlink-context-step-button previous"
                    aria-label="全部文档：上一个层级"
                    on:click={() => stepAllBacklinkDocumentContextVisibilityLevel("previous")}
                >
                    {@html renderIcon("iconBlChevronLeft")}
                </button>
                <div class="backlink-context-state-group">
                    {#each BACKLINK_CONTEXT_LEVEL_ORDER as level}
                        <button
                            type="button"
                            class="backlink-chip backlink-chip--flat backlink-context-state ariaLabel {level === backlinkGlobalContextVisibilityLevel ? 'active' : ''}"
                            data-context-level={level}
                            aria-pressed={level === backlinkGlobalContextVisibilityLevel}
                            aria-label={getBacklinkContextLevelTooltip(level)}
                            on:click={() => setAllBacklinkDocumentContextVisibilityLevel(level)}
                        >
                            {getBacklinkContextLevelLabel(level)}
                        </button>
                    {/each}
                </div>
                <button
                    type="button"
                    class="block__icon ariaLabel backlink-context-step-button next"
                    aria-label="全部文档：下一个层级"
                    on:click={() => stepAllBacklinkDocumentContextVisibilityLevel("next")}
                >
                    {@html renderIcon("iconBlChevronRight")}
                </button>
            </div>
        </div>
    {/if}
</div>

<div class="backlinkList fn__flex-1 {panelBacklinkViewExpand ? '' : 'fn__none'}">
    <div class="sy__backlink">
        {#if displayHintBacklinkBlockCacheUsage}
            <div>此次查询使用了缓存数据</div>
        {/if}
        <div class="block__icons" style="display: none;"></div>
        {#if backlinkFilterPanelRenderData && !isArrayNotEmpty(backlinkFilterPanelRenderData.backlinkDataArray)}
            <!-- 空态：居中线框图标 + 主文案 + 辅助提示 -->
            <div class="backlink-empty-state">
                {@html renderIcon("iconBlEmptyLink", 32)}
                <div class="backlink-empty-state__title">{EnvConfig.ins.i18n.emptyBacklinkTitle || "当前文档暂无反向链接"}</div>
                <div class="backlink-empty-state__hint">{EnvConfig.ins.i18n.emptyBacklinkHint || "在其他文档中引用本文档后，将显示在这里"}</div>
            </div>
        {:else if !backlinkFilterPanelRenderData}
            <!-- 加载态：骨架屏占位，避免布局跳动 -->
            <div class="backlink-skeleton-list">
                <div class="backlink-skeleton-card"></div>
                <div class="backlink-skeleton-card"></div>
            </div>
        {/if}
        <div class="fn__flex-1">
            <ul
                bind:this={backlinkULElement}
                class="b3-list b3-list--background {hideBacklinkProtyleBreadcrumb ? 'hide-breadcrumb' : ''}"
            ></ul>
        </div>
    </div>
</div>
