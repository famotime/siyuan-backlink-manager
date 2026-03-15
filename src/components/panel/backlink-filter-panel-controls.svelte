<script lang="ts">
    import {
        CUR_DOC_DEF_BLOCK_SORT_METHOD_ELEMENT,
        CUR_DOC_DEF_BLOCK_TYPE_ELEMENT,
        RELATED_DEF_BLOCK_SORT_METHOD_ELEMENT,
        RELATED_DEF_BLOCK_TYPE_ELEMENT,
        RELATED_DOCMUMENT_SORT_METHOD_ELEMENT,
    } from "@/models/backlink-constant";

    export let panelFilterViewExpand = false;
    export let backlinkFilterPanelRenderData;
    export let queryCurDocDefBlockRange = "";
    export let queryParams;
    export let savedQueryParamMap;
    export let showSaveCriteriaInputBox = false;
    export let saveCriteriaInputText = "";
    export let resetFilterQueryParametersToDefault;
    export let clearCacheAndRefresh;
    export let initBaseData;
    export let refreshFilterDisplayData;
    export let handleFilterPanelInput;
    export let handleRelatedDefBlockClick;
    export let handleRelatedDefBlockContextmenu;
    export let handleRelatedDocBlockClick;
    export let handleRelatedDocBlockContextmenu;
    export let handleSavedPanelCriteriaClick;
    export let handleSavedPanelCriteriaDeleteClick;
    export let handleCriteriaCancel;
    export let handleCriteriaConfirm;
    export let getDefBlockAriaLabel;
    export let getBlockTypeIconHrefByBlock;
    export let stickyElement;

    function handleKeyDownDefault() {}
</script>

<div class="backlink-filter-panel-sticky" bind:this={stickyElement}>
    <div class="backlink-panel__header">
        <div
            class="panel__title filter-panel__title block__icons"
            on:click={() => {
                panelFilterViewExpand = !panelFilterViewExpand;
            }}
            on:keydown={handleKeyDownDefault}
        >
            <div class="block__logo" style="font-weight: bold;">
                <svg class="block__logoicon"><use xlink:href="#iconFilter"></use></svg>筛选面板
            </div>
            <span class="fn__flex-1"></span>
            <span class="fn__space"></span>
            <span
                class="block__icon ariaLabel"
                aria-label="恢复默认"
                on:click|stopPropagation={resetFilterQueryParametersToDefault}
                on:keydown={handleKeyDownDefault}
            ><svg><use xlink:href="#iconResetInitialization"></use></svg></span>
            <span class="fn__space"></span>
            <span class="fn__space"></span>
            <span
                class="block__icon ariaLabel"
                aria-label="清除缓存并刷新"
                on:click|stopPropagation={clearCacheAndRefresh}
                on:keydown={handleKeyDownDefault}
            ><svg><use xlink:href="#iconRefresh"></use></svg></span>
            <span class="fn__space"></span>
            <span class="fn__space"></span>
            {#if panelFilterViewExpand}
                <span class="block__icon ariaLabel" aria-label="折叠">
                    <svg><use xlink:href="#iconUp"></use></svg>
                </span>
            {:else}
                <span class="block__icon ariaLabel" aria-label="展开">
                    <svg><use xlink:href="#iconDown"></use></svg>
                </span>
            {/if}
        </div>
    </div>

    {#if backlinkFilterPanelRenderData && panelFilterViewExpand}
        <div class="backlink-panel-filter">
            <div class="fn__flex">
                <div class="filter-panel__sub_title">定义块范围：</div>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryCurDocDefBlockRange}
                    on:change={initBaseData}
                    style="flex: 0.7;"
                >
                    {#each CUR_DOC_DEF_BLOCK_TYPE_ELEMENT() as element}
                        <option value={element.value} selected={element.value == queryCurDocDefBlockRange}>
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.filterPanelCurDocDefBlockSortMethod}
                    on:change={refreshFilterDisplayData}
                >
                    {#each CUR_DOC_DEF_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value == queryParams.filterPanelCurDocDefBlockSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleFilterPanelInput}
                    bind:value={queryParams.filterPanelCurDocDefBlockKeywords}
                />
            </div>
            <div class="defblock-list">
                {#each backlinkFilterPanelRenderData.curDocDefBlockArray as defBlock (defBlock.id)}
                    {#if !defBlock.filterStatus}
                        <div
                            id={defBlock.id}
                            class="tag backlink-chip backlink-chip--interactive ariaLabel {defBlock.selectionStatus.toLowerCase()}"
                            aria-label={getDefBlockAriaLabel(defBlock, true)}
                            on:click|preventDefault={(event) =>
                                handleRelatedDefBlockClick(event, defBlock)}
                            on:contextmenu|preventDefault={(event) =>
                                handleRelatedDefBlockContextmenu(event, defBlock)}
                            on:keydown={handleKeyDownDefault}
                        >
                            <svg class="b3-list-item__graphic">
                                <use xlink:href={getBlockTypeIconHrefByBlock(defBlock)}></use>
                            </svg>
                            <span class="block-content">{defBlock.content}</span>
                            <span class="count">{defBlock.refCount}</span>
                        </div>
                    {/if}
                {/each}
            </div>
            <div class="fn__flex">
                <div class="filter-panel__sub_title">关联的定义块：</div>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.filterPanelRelatedDefBlockType}
                    on:change={refreshFilterDisplayData}
                    style="flex: 0.5;"
                >
                    {#each RELATED_DEF_BLOCK_TYPE_ELEMENT() as element}
                        <option value={element.value} selected={element.value == queryParams.filterPanelRelatedDefBlockType}>
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.filterPanelRelatedDefBlockSortMethod}
                    on:change={refreshFilterDisplayData}
                >
                    {#each RELATED_DEF_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value == queryParams.filterPanelRelatedDefBlockSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleFilterPanelInput}
                    bind:value={queryParams.filterPanelRelatedDefBlockKeywords}
                />
            </div>
            <div class="defblock-list">
                {#each backlinkFilterPanelRenderData.relatedDefBlockArray as defBlock (defBlock.id)}
                    {#if !defBlock.filterStatus}
                        <div
                            class="tag backlink-chip backlink-chip--interactive ariaLabel {defBlock.selectionStatus.toLowerCase()}"
                            aria-label={getDefBlockAriaLabel(defBlock, true)}
                            on:click={(event) => handleRelatedDefBlockClick(event, defBlock)}
                            on:contextmenu|preventDefault={(event) =>
                                handleRelatedDefBlockContextmenu(event, defBlock)}
                            on:keydown={handleKeyDownDefault}
                        >
                            <svg class="b3-list-item__graphic">
                                <use xlink:href={getBlockTypeIconHrefByBlock(defBlock)}></use>
                            </svg>
                            <span class="block-content">{defBlock.content}</span>
                            <span class="count">{defBlock.refCount}</span>
                        </div>
                    {/if}
                {/each}
            </div>
            <div class="fn__flex">
                <div class="filter-panel__sub_title">反链所在文档：</div>
                <select
                    class="b3-select fn__flex-center"
                    bind:value={queryParams.filterPanelBacklinkDocumentSortMethod}
                    on:change={refreshFilterDisplayData}
                >
                    {#each RELATED_DOCMUMENT_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value == queryParams.filterPanelBacklinkDocumentSortMethod}
                        >
                            {element.name}
                        </option>
                    {/each}
                </select>
                <span class="fn__space"></span>
                <input
                    class="b3-text-field fn__size200"
                    on:input={handleFilterPanelInput}
                    bind:value={queryParams.filterPanelBacklinkDocumentKeywords}
                />
            </div>
            <div class="defblock-list">
                {#each backlinkFilterPanelRenderData.backlinkDocumentArray as defBlock (defBlock.id)}
                    {#if !defBlock.filterStatus}
                        <div
                            class="tag backlink-chip backlink-chip--interactive ariaLabel {defBlock.selectionStatus.toLowerCase()}"
                            aria-label={getDefBlockAriaLabel(defBlock, true)}
                            on:click={(event) => handleRelatedDocBlockClick(event, defBlock)}
                            on:contextmenu|preventDefault={(event) =>
                                handleRelatedDocBlockContextmenu(event, defBlock)}
                            on:keydown={handleKeyDownDefault}
                        >
                            <svg class="b3-list-item__graphic">
                                <use xlink:href={getBlockTypeIconHrefByBlock(defBlock)}></use>
                            </svg>
                            <span class="block-content">{defBlock.content}</span>
                            <span class="count">{defBlock.refCount}</span>
                        </div>
                    {/if}
                {/each}
            </div>
            <div>
                <p>
                    <button
                        style="margin-right: 12px;"
                        class="b3-button save-button"
                        on:click={() => {
                            showSaveCriteriaInputBox = true;
                        }}>保存当前条件</button
                    >
                    {#if savedQueryParamMap}
                        {#each savedQueryParamMap.keys() as name}
                            <div class="tag backlink-chip backlink-chip--interactive backlink-saved-criteria-tag optional">
                                <span
                                    class="block-content"
                                    style="min-width:30px;"
                                    on:click={() => {
                                        handleSavedPanelCriteriaClick(name);
                                    }}
                                    on:keydown={handleKeyDownDefault}
                                >
                                    {name}
                                </span>
                                <span
                                    class="block__icon"
                                    on:click={() => {
                                        handleSavedPanelCriteriaDeleteClick(name);
                                    }}
                                    on:keydown={handleKeyDownDefault}
                                >
                                    <svg style="width: 8px;"><use xlink:href="#iconClose"></use></svg>
                                </span>
                            </div>
                        {/each}
                    {/if}
                </p>
                {#if showSaveCriteriaInputBox}
                    <div class="input-box">
                        <input
                            type="text"
                            bind:value={saveCriteriaInputText}
                            class="b3-text-field input-field"
                            placeholder="请输入名称"
                        />
                        <div class="buttons">
                            <button
                                class="cancel-button b3-button b3-button--outline"
                                on:click={handleCriteriaCancel}>取消</button
                            >
                            <button class="confirm-button b3-button" on:click={handleCriteriaConfirm}>
                                确定
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
