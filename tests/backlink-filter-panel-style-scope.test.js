import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelCssPath = new URL(
    "../src/components/panel/backlink-filter-panel-page.css",
    import.meta.url,
);

test("backlink filter panel styles scope host selectors under backlink-panel__area", () => {
    const css = readFileSync(panelCssPath, "utf8");

    const requiredScopedSelectors = [
        ".backlink-panel__area select",
        ".backlink-panel__area input",
        ".backlink-panel__area .b3-list-item__graphic",
        ".backlink-panel__area .block__icon",
    ];

    for (const selector of requiredScopedSelectors) {
        assert.match(
            css,
            new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
            `expected scoped selector ${selector}`,
        );
    }

    const forbiddenUnscopedSelectors = [
        /(^|\n)select\s*\{/,
        /(^|\n)input\s*\{/,
        /(^|\n)\.b3-list-item__graphic\s*\{/,
        /(^|\n)\.block__icon\s*\{/,
    ];

    for (const selectorPattern of forbiddenUnscopedSelectors) {
        assert.doesNotMatch(
            css,
            selectorPattern,
            `found leaking selector ${selectorPattern}`,
        );
    }
});

test("backlink flat chips keep a pill radius", () => {
    const css = readFileSync(panelCssPath, "utf8");

    assert.match(css, /--backlink-chip-flat-radius:\s*999px;/);
    assert.match(
        css,
        /\.backlink-panel__area\s+\.backlink-chip--flat\s*\{[\s\S]*?border-radius:\s*var\(--backlink-chip-flat-radius\);[\s\S]*?\}/,
    );
});

test("backlink context state chips stay flatter than the generic pill", () => {
    const css = readFileSync(panelCssPath, "utf8");

    assert.match(
        css,
        /\.backlink-panel__area\s+\.backlink-context-state\s*\{[\s\S]*?height:\s*14px;[\s\S]*?min-height:\s*14px;[\s\S]*?padding:\s*0 3px;[\s\S]*?line-height:\s*1;[\s\S]*?\}/,
    );
});

test("collapsed backlink documents hide context controls and breadcrumb rows", () => {
    const css = readFileSync(panelCssPath, "utf8");

    assert.match(
        css,
        /\.backlink-panel__area\s+\.list-item__document-name\.backlink-hide\s+\.backlink-context-control-row,\s*\.backlink-panel__area\s+\.list-item__document-name\.backlink-hide\s+\.backlink-breadcrumb-row\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
    );
});
