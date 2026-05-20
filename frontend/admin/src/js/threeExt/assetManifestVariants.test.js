import assert from "node:assert/strict";
import { test } from "node:test";

import { pickVariantFromManifest } from "./assetManifestVariants.js";

test("pickVariantFromManifest chooses the preferred ready variant", () => {
    const manifest = {
        assetId: "asset-1",
        preferredVariant: "n2",
        variants: {
            original: { status: "ready", path: "assets/original.glb" },
            n2: { status: "ready", path: "assets/n2.glb" },
        },
    };

    assert.deepEqual(pickVariantFromManifest(manifest), {
        variant: "n2",
        path: "/assets/n2.glb",
    });
});

test("pickVariantFromManifest falls back to the first ready variant", () => {
    const manifest = {
        assetId: "asset-2",
        preferredVariant: "n3",
        variants: {
            original: { status: "processing", path: "assets/original.glb" },
            n1: { status: "ready", path: "/assets/n1.glb" },
            n3: { status: "missing", path: null },
        },
    };

    assert.deepEqual(pickVariantFromManifest(manifest), {
        variant: "n1",
        path: "/assets/n1.glb",
    });
});

test("pickVariantFromManifest throws when no selected variant is ready", () => {
    const manifest = {
        assetId: "asset-3",
        preferredVariant: "n3",
        variants: {
            original: { status: "missing", path: null },
            n3: { status: "processing", path: "assets/n3.glb" },
        },
    };

    assert.throws(
        () => pickVariantFromManifest(manifest, { allowFallback: false }),
        /No ready variant for asset asset-3/
    );
});
