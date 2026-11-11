/*
 * Copyright (c) 2024 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2023-05-19 19:49:13
 * @FilePath     : /svelte.config.js
 * @Description  :
 */
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

export default {
    // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
    // for more information about preprocessors
    preprocess: vitePreprocess(),
    onwarn: (warning, handler) => {
        // 屏蔽 a11y 可访问性告警（Svelte 3 旧码形如 "A11y:..."，Svelte 4 起为 "a11y-..." 前缀）
        if (warning.code.startsWith('A11y:') || warning.code.startsWith('a11y-')) {
            return;
        }
        handler(warning);
    }
}
