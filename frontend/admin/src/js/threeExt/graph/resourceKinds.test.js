import assert from "node:assert/strict";
import { test } from "node:test";

import { detectAssetKind } from "./resourceKinds.js";

test("detectAssetKind prefers explicit asset kind", () => {
    assert.equal(detectAssetKind({ kind: "SPLAT", name: "model.glb" }), "splat");
});

test("detectAssetKind detects kind from resolved source URL", () => {
    assert.equal(
        detectAssetKind({ name: "asset-without-extension" }, { url: "https://example.test/model.pcd" }),
        "pointcloud"
    );
});

test("detectAssetKind defaults to gltf for unknown sources", () => {
    assert.equal(detectAssetKind({ name: "unknown.asset" }), "gltf");
});
