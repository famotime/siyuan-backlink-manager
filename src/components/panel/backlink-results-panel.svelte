<script lang="ts">
    import { EnvConfig } from "@/config/EnvConfig";
    import {
        BACKLINK_BLOCK_SORT_METHOD_ELEMENT,
        RELATED_DEF_BLOCK_TYPE_ELEMENT,
    } from "@/models/backlink-constant";
    import { isArrayNotEmpty } from "@/utils/array-util";
    import {
        buildBacklinkPaginationState,
        getBacklinkSummaryText,
    } from "./backlink-panel-header.js";

    export let panelBacklinkViewExpand = true;
    export let queryParams;
    export let backlinkFilterPanelRenderData;
    export let backlinkPaginationState = buildBacklinkPaginationState();
    export let displayHintBacklinkBlockCacheUsage = false;
    export let hideBacklinkProtyleBreadcrumb = false;
    export let backlinkULElement;
    export let resetBacklinkQueryParametersToDefault;
    export let updateRenderData;
    export let handleBacklinkKeywordInput;
    export let expandAllBacklinkDocument;
    export let expandAllBacklinkListItemNode;
    export let collapseAllBacklinkDocument;
    export let collapseAllBacklinkListItemNode;
    export let pageTurning;

    function handleKeyDownDefault() {}
</script>

<div class="backlink-panel__header">
    <div
        class="panel__title backlink-panel__title block__icons"
        on:click={() => {
            panelBacklinkViewExpand = !panelBacklinkViewExpand;
        }}
        on:keydown={handleKeyDownDefault}
    >
        <div class="block__logo" style="font-weight: bold;">
            <svg class="block__logoicon"><use xlink:href="#iconLink"></use></svg>反向链接
        </div>
        <span class="fn__flex-1"></span>
        <span class="fn__space"></span>
        <span
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="恢复默认"
            on:click|stopPropagation={resetBacklinkQueryParametersToDefault}
            on:keydown={handleKeyDownDefault}
        ><svg><use xlink:href="#iconResetInitialization"></use></svg></span>
        <span class="fn__space"></span>
        <span class="fn__space"></span>
        {#if panelBacklinkViewExpand}
            <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠">
                <svg><use xlink:href="#iconUp"></use></svg>
            </span>
        {:else}
            <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label="展开">
                <svg><use xlink:href="#iconDown"></use></svg>
            </span>
        {/if}
    </div>
    {#if panelBacklinkViewExpand && queryParams}
        <div class="fn__flex" style="padding: 5px 15px; maragin:0px;">
            <select
                class="b3-select fn__flex-center ariaLabel"
                bind:value={queryParams.backlinkCurDocDefBlockType}
                on:change={updateRenderData}
                style="flex: 0.5;"
                aria-label="当前文档定义块类型"
            >
                {#each RELATED_DEF_BLOCK_TYPE_ELEMENT() as element}
                    <option value={element.value} selected={element.value == queryParams.backlinkCurDocDefBlockType}>
                        {element.name}
                    </option>
                {/each}
            </select>
            <span class="fn__space"></span>
            <select
                class="b3-select fn__flex-center"
                bind:value={queryParams.backlinkBlockSortMethod}
                on:change={updateRenderData}
            >
                {#each BACKLINK_BLOCK_SORT_METHOD_ELEMENT() as element}
                    <option value={element.value} selected={element.value == queryParams.backlinkBlockSortMethod}>
                        {element.name}
                    </option>
                {/each}
            </select>
            <span class="fn__space"></span>
            <input
                class="b3-text-field fn__size200"
                on:input={handleBacklinkKeywordInput}
                bind:value={queryParams.backlinkKeywordStr}
            />
            <span
                class="block__icon b3-tooltips b3-tooltips__sw"
                aria-label="展开所有文档"
                on:click={expandAllBacklinkDocument}
                on:contextmenu={expandAllBacklinkListItemNode}
                on:keydown={handleKeyDownDefault}
            >
                <svg><use xlink:href="#iconExpand"></use></svg>
            </span>
            <span class="fn__space"></span>
            <span
                class="block__icon b3-tooltips b3-tooltips__sw"
                aria-label="折叠所有文档"
                on:click={collapseAllBacklinkDocument}
                on:contextmenu={collapseAllBacklinkListItemNode}
                on:keydown={handleKeyDownDefault}
            >
                <svg><use xlink:href="#iconContract"></use></svg>
            </span>
        </div>
    {/if}
    {#if panelBacklinkViewExpand && backlinkFilterPanelRenderData && isArrayNotEmpty(backlinkFilterPanelRenderData.backlinkDataArray)}
        <div class="block__icons" style="overflow:auto;style=color:var(--b3-theme-on-background);">
            <span class="fn__flex-shrink ft__selectnone {backlinkPaginationState.isVisible ? '' : 'fn__none'}">
                <span class="fn__space"></span>
                <span>
                    {getBacklinkSummaryText(
                        EnvConfig.ins.i18n,
                        backlinkFilterPanelRenderData.backlinkDocumentCount,
                    )}
                </span>
            </span>
            <span class="fn__space"></span>
            <span class="fn__flex-1" style="min-height: 100%"></span>
            <span
                class="fn__flex-shrink ft__selectnone backlink-pagination {backlinkPaginationState.isVisible ? '' : 'fn__none'}"
            >
                <span
                    data-position="9bottom"
                    class="block__icon block__icon--show ariaLabel backlink-nav-button {backlinkPaginationState.previousDisabled ? 'disabled' : ''}"
                    aria-label={EnvConfig.ins.i18n.previousLabel}
                    on:click={() => {
                        pageTurning(backlinkFilterPanelRenderData.pageNum - 1);
                    }}
                    on:keydown={handleKeyDownDefault}
                ><svg><use xlink:href="#iconLeft"></use></svg></span>
                <span class="backlink-nav-progress">{backlinkPaginationState.progressText}</span>
                <span
                    data-position="9bottom"
                    class="block__icon block__icon--show ariaLabel backlink-nav-button {backlinkPaginationState.nextDisabled ? 'disabled' : ''}"
                    aria-label={EnvConfig.ins.i18n.nextLabel}
                    on:click={() => {
                        pageTurning(backlinkFilterPanelRenderData.pageNum + 1);
                    }}
                    on:keydown={handleKeyDownDefault}
                ><svg><use xlink:href="#iconRight"></use></svg></span>
            </span>
            <span class="fn__space"></span>
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
