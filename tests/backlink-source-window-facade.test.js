import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("source-window facade does not reintroduce the __internal test backdoor", () => {
  const source = readFileSync(
    new URL("../src/service/backlink/backlink-source-window.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /__internal/);
});
