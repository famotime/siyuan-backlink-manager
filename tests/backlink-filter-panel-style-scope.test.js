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
