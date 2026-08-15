<script lang="ts">
    import { EnvConfig } from "@/config/EnvConfig";
    import {
        BACKLINK_BLOCK_SORT_METHOD_ELEMENT,
    } from "@/models/backlink-constant";
    import { isArrayNotEmpty } from "@/utils/array-util";
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
            <svg
                class="block__logoicon b3-icon--wireframe"
                style="fill: none !important;"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
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
            <svg
                style="fill: none !important;"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
                <path d="M21 3v5h-5" />
            </svg>
        </button>
        <button
            type="button"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="恢复默认设置与筛选条件"
            on:click|stopPropagation={resetBacklinkQueryParametersToDefault}
            on:keydown={handleKeyDownDefault}
        >
            <svg
                style="fill: none !important;"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
            </svg>
        </button>
        {#if panelBacklinkViewExpand}
            <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠面板">
                <svg
                    style="fill: none !important;"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M18 15l-6-6-6 6" />
                </svg>
            </span>
        {:else}
            <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label="展开面板">
                <svg
                    style="fill: none !important;"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </span>
        {/if}
    </div>
    {#if panelBacklinkViewExpand && queryParams}
        <div class="backlink-toolbar-row">
            <div class="backlink-search-input-wrap">
                <svg
                    class="backlink-search-icon"
                    style="fill: none !important;"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    class="b3-text-field backlink-search-input"
                    placeholder="搜索关键词..."
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
                        <svg
                            style="fill: none !important;"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                {/if}
            </div>
            <div class="backlink-toolbar-actions">
                <select
                    class="b3-select backlink-sort-select"
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
                    aria-label={isAllExpanded
                        ? "左键：折叠所有文档\n右键：折叠列表项节点"
                        : "左键：展开所有文档\n右键：展开列表项节点"}
                    on:click={toggleAllBacklinkDocuments}
                    on:contextmenu={handleToggleContextMenu}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg
                        style="fill: none !important;"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        {#if isAllExpanded}
                            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                        {:else}
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        {/if}
                    </svg>
                </button>
            </div>
        </div>
    {/if}
    {#if panelBacklinkViewExpand && backlinkFilterPanelRenderData && isArrayNotEmpty(backlinkFilterPanelRenderData.backlinkDataArray)}
        <div class="block__icons backlink-results-summary-row">
            <span class="fn__flex-shrink ft__selectnone backlink-results-summary-text">
                {getBacklinkSummaryText(
                    EnvConfig.ins.i18n,
                    backlinkFilterPanelRenderData.backlinkDocumentCount,
                )}
            </span>
        </div>
        <div class="block__icons backlink-results-global-context-row">
            <div class="backlink-context-control-row backlink-context-control-row--global">
                <button
                    type="button"
                    class="block__icon ariaLabel backlink-context-step-button previous"
                    aria-label="全部文档：切换到上一个上下文层级"
                    on:click={() => stepAllBacklinkDocumentContextVisibilityLevel("previous")}
                >
                    <svg
                        style="fill: none !important;"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
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
                    aria-label="全部文档：切换到下一个上下文层级"
                    on:click={() => stepAllBacklinkDocumentContextVisibilityLevel("next")}
                >
                    <svg
                        style="fill: none !important;"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M9 18l6-6-6-6" />
                    </svg>
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
        <div class="fn__flex-1">
            <ul
                bind:this={backlinkULElement}
                class="b3-list b3-list--background {hideBacklinkProtyleBreadcrumb ? 'hide-breadcrumb' : ''}"
            ></ul>
        </div>
    </div>
</div>
