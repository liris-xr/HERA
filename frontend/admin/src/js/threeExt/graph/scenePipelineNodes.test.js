import assert from "node:assert/strict";
import { test } from "node:test";

import { RenderNode } from "./scenePipelineNodes.js";

test("RenderNode adds the decoded object to the scene", async () => {
    const object3D = { name: "decoded-object" };
    const added = [];
    const scene = {
        add(object) {
            added.push(object);
        },
    };

    const result = await RenderNode().run(
        { scene },
        { resource: { object3D } }
    );

    assert.deepEqual(result, {});
    assert.deepEqual(added, [object3D]);
});

test("RenderNode reports missing scene and object clearly", async () => {
    await assert.rejects(
        () => RenderNode().run({}, { resource: { object3D: {} } }),
        /ctx\.scene missing/
    );

    await assert.rejects(
        () => RenderNode().run({ scene: { add() {} } }, { resource: { object3D: null } }),
        /resource\.object3D missing/
    );
});
