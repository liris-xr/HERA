import assert from "node:assert/strict";
import { test } from "node:test";

import { createInitialPipelineState, runLinearGraph } from "./graphRuntime.js";

test("runLinearGraph applies plain-object patches in order", async () => {
    const nodes = [
        {
            id: "SetUrl",
            requires: ["input.asset"],
            provides: ["source.url"],
            async run() {
                return { source: { url: "/public/assets/model.glb" } };
            },
        },
        {
            id: "Measure",
            requires: ["source.url"],
            provides: ["metrics.assetSizeBytes"],
            async run(ctx, state) {
                return { metrics: { assetSizeBytes: state.source.url.length } };
            },
        },
    ];

    const state = await runLinearGraph({ asset: { id: "asset-1" } }, nodes);

    assert.equal(state.source.url, "/public/assets/model.glb");
    assert.equal(state.metrics.assetSizeBytes, 24);
    assert.deepEqual(state.runtime.executedNodes, ["SetUrl", "Measure"]);
});

test("runLinearGraph fails before running a node with missing requirements", async () => {
    const state = createInitialPipelineState({ asset: null });
    const originalWarn = console.warn;
    console.warn = () => {};
    const nodes = [
        {
            id: "NeedsAsset",
            requires: ["input.asset"],
            provides: [],
            async run() {
                throw new Error("should not run");
            },
        },
    ];

    try {
        await assert.rejects(
            () => runLinearGraph({}, nodes, { initialState: state }),
            /Node 'NeedsAsset' missing required paths: input\.asset/
        );
        assert.deepEqual(state.runtime.executedNodes, []);
        assert.equal(state.runtime.warnings.length, 1);
    } finally {
        console.warn = originalWarn;
    }
});

test("runLinearGraph keeps non-plain runtime values by reference", async () => {
    class RuntimeObject {}
    const object3D = new RuntimeObject();

    const state = await runLinearGraph(
        { asset: { id: "asset-1" } },
        [
            {
                id: "Decode",
                requires: ["input.asset"],
                provides: ["resource.object3D"],
                async run() {
                    return { resource: { object3D } };
                },
            },
        ]
    );

    assert.equal(state.resource.object3D, object3D);
});
