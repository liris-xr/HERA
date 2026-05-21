import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("createDefaultAssetGraph keeps scene rendering outside the default asset graph", async () => {
    const source = await readFile(new URL("./defaultAssetGraph.js", import.meta.url), "utf8");

    assert.match(source, /InputAssetNode\(\)/);
    assert.match(source, /ResolveAssetUrlNode\(\)/);
    assert.match(source, /AssetMetricNode\(\)/);
    assert.match(source, /DecodeNode\(\)/);
    assert.doesNotMatch(source, /RenderNode/);
});
