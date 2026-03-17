import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("production source files do not import backlink preview assembly", () => {
  const interactionModule = readFileSync(
    new URL("../src/components/panel/backlink-document-interaction.js", import.meta.url),
    "utf8",
  );
  const contextModule = readFileSync(
    new URL("../src/service/backlink/backlink-context.js", import.meta.url),
    "utf8",
  );
  const modelModule = readFileSync(
    new URL("../src/models/backlink-model.ts", import.meta.url),
    "utf8",
  );

  assert.equal(
    interactionModule.includes("backlink-preview-assembly.js"),
    false,
  );
  assert.equal(
    contextModule.includes("previewSequence"),
    false,
  );
  assert.equal(
    modelModule.includes("previewSequence"),
    false,
  );
});

test("production panel consumers read source window semantics through getters instead of legacy root fields", () => {
  const interactionModule = readFileSync(
    new URL("../src/components/panel/backlink-document-interaction.js", import.meta.url),
    "utf8",
  );
  const domModule = readFileSync(
    new URL("../src/components/panel/backlink-protyle-dom.js", import.meta.url),
    "utf8",
  );
  const navigationModule = readFileSync(
    new URL("../src/components/panel/backlink-document-navigation.js", import.meta.url),
    "utf8",
  );

  assert.match(interactionModule, /getBacklinkSourceWindowIdentity/);
  assert.match(interactionModule, /getBacklinkSourceWindowBodyRange/);
  assert.doesNotMatch(interactionModule, /sourceWindow\.(rootId|anchorBlockId|focusBlockId|startBlockId|endBlockId)\b/);

  assert.match(domModule, /getBacklinkSourceWindowBodyRange/);
  assert.doesNotMatch(domModule, /sourceWindow\.(windowBlockIds|visibleBlockIds|orderedVisibleBlockIds|collapsedBlockIds)\b/);

  assert.match(navigationModule, /getBacklinkDataSourceDocumentOrder/);
  assert.doesNotMatch(navigationModule, /sourceWindows\?\.(core|nearby|extended)\?\.(rootId|anchorBlockId|focusBlockId)\b/);
});
