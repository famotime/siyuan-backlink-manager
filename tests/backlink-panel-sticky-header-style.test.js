import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelCssPath = new URL(
    "../src/components/panel/backlink-filter-panel-page.css",
    import.meta.url,
);

test("backlink panel sticky headers use an opaque surface layer above scrolling content", () => {
    const css = readFileSync(panelCssPath, "utf8");
    const headerRuleMatch = css.match(
        /\.backlink-panel__area\s+\.backlink-panel__header\s*\{([\s\S]*?)\}/,
    );

    assert.ok(headerRuleMatch, "expected backlink-panel__header style rule");

    const headerRuleBody = headerRuleMatch[1];

    assert.match(headerRuleBody, /position:\s*sticky/);
    assert.match(headerRuleBody, /top:\s*0/);
    assert.match(headerRuleBody, /z-index:\s*\d+/);
    assert.match(
        headerRuleBody,
        /(background|background-color):\s*var\(--b3-theme-surface\)/,
        "sticky header needs an opaque surface background to prevent overlap bleed-through",
    );
}
);
