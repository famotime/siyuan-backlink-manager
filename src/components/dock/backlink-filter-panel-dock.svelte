<script lang="ts">
    import { EnvConfig } from "@/config/EnvConfig";
    import { onDestroy, onMount } from "svelte";
    import BacklinkFilterPanelPageSvelte from "@/components/panel/backlink-filter-panel-page.svelte";
    import { isStrNotBlank } from "@/utils/string-util";
    import {
        resolveDockMobileSidebarState,
        resolveDockResizeState,
        resolveDockSwitchProtyleRootId,
    } from "./backlink-dock-coordinator.js";

    let isMobile = false;
    let dockActive = false;
    let lastRootId: string = "";

    let rootId: string = "";
    let focusBlockId: string = "";
    let panelBacklinkViewExpand: boolean = true;
    let currentTab = null;

    let mobileSidebarObserver: MutationObserver;
    let switchProtyleHandler: ((e: any) => void) | null = null;

    onMount(async () => {
        init();
        initObserver();
    });
    onDestroy(() => {
        destroyObserver();
        if (switchProtyleHandler) {
            EnvConfig.ins.plugin?.eventBus?.off?.(
                "switch-protyle",
                switchProtyleHandler,
            );
            switchProtyleHandler = null;
        }
    });

    export function resize(clientWidth?: number) {
        const resizeState = resolveDockResizeState({
            currentRootId: rootId,
            clientWidth,
            lastRootId,
            fallbackDocId: EnvConfig.ins?.lastViewedDocId,
        });
        dockActive = resizeState.dockActive;
        rootId = resizeState.nextRootId;
    }

    async function init() {
        isMobile = EnvConfig.ins.isMobile;
        lastRootId = EnvConfig.ins.lastViewedDocId || "";
        if (!rootId && lastRootId) {
            rootId = lastRootId;
        }

        switchProtyleHandler = (e: any) => {
            switchProtyleCallback(e);
        };
        EnvConfig.ins.plugin?.eventBus?.on?.(
            "switch-protyle",
            switchProtyleHandler,
        );
    }

    async function switchProtyleCallback(e) {
        if (e && e.detail && e.detail.protyle && e.detail.protyle.block) {
            const incomingRootId = e.detail.protyle.block.rootID;
            const result = resolveDockSwitchProtyleRootId({
                currentRootId: rootId,
                incomingRootId,
                dockActive,
            });
            lastRootId = result.nextLastRootId;
            rootId = result.nextRootId;
        }
    }

    function initObserver() {
        if (!isMobile) {
            return;
        }
        const sidebarElement = document.getElementById("sidebar");

        if (!sidebarElement) {
            return;
        }
        mobileSidebarObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "style") {
                    const newTransform = (mutation.target as HTMLElement).style
                        .transform;
                    const hasTransform = isStrNotBlank(newTransform);
                    const sidebarState = resolveDockMobileSidebarState({
                        currentRootId: rootId,
                        hasTransform,
                        lastRootId,
                        fallbackDocId: EnvConfig.ins?.lastViewedDocId,
                    });
                    dockActive = sidebarState.dockActive;
                    rootId = sidebarState.nextRootId;
                }
            });
        });

        mobileSidebarObserver.observe(sidebarElement, { attributes: true });
    }

    function destroyObserver() {
        if (mobileSidebarObserver) {
            mobileSidebarObserver.disconnect();
        }
    }
</script>

{#if isMobile}
    <div class="">
        <BacklinkFilterPanelPageSvelte
            bind:rootId
            {focusBlockId}
            {panelBacklinkViewExpand}
            {currentTab}
        />
    </div>
{:else}
    <div class="fn__flex-column">
        <BacklinkFilterPanelPageSvelte
            bind:rootId
            {focusBlockId}
            {panelBacklinkViewExpand}
            {currentTab}
        />
    </div>
{/if}
