import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viteConfigPath = new URL("../vite.config.ts", import.meta.url);

test("vite config opts scss preprocessing into Sass modern API", () => {
    const configText = readFileSync(viteConfigPath, "utf8");

    assert.match(
        configText,
        /css\s*:\s*\{[\s\S]*preprocessorOptions\s*:\s*\{[\s\S]*scss\s*:\s*\{[\s\S]*api\s*:\s*["']modern["']/,
        "expected vite css.preprocessorOptions.scss.api to be set to 'modern'",
    );
});
