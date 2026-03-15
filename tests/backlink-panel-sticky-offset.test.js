import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSveltePath = new URL(
    "../src/components/panel/backlink-filter-panel-page.svelte",
    import.meta.url,
);
const controlsSveltePath = new URL(
    "../src/components/panel/backlink-filter-panel-controls.svelte",
    import.meta.url,
);
const resultsSveltePath = new URL(
    "../src/components/panel/backlink-results-panel.svelte",
    import.meta.url,
);
const panelCssPath = new URL(
    "../src/components/panel/backlink-filter-panel-page.css",
    import.meta.url,
);

test("backlink panel keeps filter controls sticky and offsets results header underneath", () => {
    const pageSvelte = readFileSync(pageSveltePath, "utf8");
    const controlsSvelte = readFileSync(controlsSveltePath, "utf8");
    const resultsSvelte = readFileSync(resultsSveltePath, "utf8");
    const css = readFileSync(panelCssPath, "utf8");

    assert.match(
        controlsSvelte,
        /backlink-filter-panel-sticky/,
        "filter controls should expose a dedicated sticky container",
    );
    assert.match(
        resultsSvelte,
        /backlink-results-panel__header/,
        "results header should expose a dedicated sticky header class",
    );
    assert.match(
        pageSvelte,
        /--backlink-filter-panel-offset/,
        "page should maintain a CSS variable for the sticky header offset",
    );
    assert.match(
        css,
        /\.backlink-panel__area\s+\.backlink-results-panel__header\s*\{[\s\S]*top:\s*var\(--backlink-filter-panel-offset/,
        "results header should stick below the filter controls offset",
    );
});
