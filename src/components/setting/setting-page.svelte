<script lang="ts">
    import { getSettingTabArray } from "@/models/setting-constant";
    import SettingItem from "./setting-item.svelte";
    import { TabProperty } from "@/models/setting-model";
    import SettingSwitch from "./inputs/setting-switch.svelte";
    import SettingSelect from "./inputs/setting-select.svelte";
    import SettingInput from "./inputs/setting-input.svelte";
    import { SettingService } from "@/service/setting/SettingService";

    let tabArray: TabProperty[] = getSettingTabArray();
    SettingService.ins.init();
</script>

<div
    class="fn__flex-1 fn__flex config__panel"
    style="width: auto; height: 100%; max-width: 1280px;"
>
    <div class="config__tab-wrap" style="width: 100%;">
        <div class="config__tab-container">
            {#each tabArray as tab}
                {#each tab.props as itemProperty}
                    <SettingItem {itemProperty}>
                        {#if itemProperty.type == "switch"}
                            <SettingSwitch {itemProperty}></SettingSwitch>
                        {:else if itemProperty.type == "select"}
                            <SettingSelect {itemProperty}></SettingSelect>
                        {:else if itemProperty.type == "number" || itemProperty.type == "text"}
                            <SettingInput {itemProperty} />
                        {:else}
                            不能载入设置项，请检查设置代码实现。 Key: {itemProperty.key}
                            <br />
                            can't load settings, check code please. Key:
                            {itemProperty.key}
                        {/if}
                    </SettingItem>
                {/each}
            {/each}
        </div>
    </div>
</div>

