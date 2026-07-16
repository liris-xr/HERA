import assert from "node:assert/strict";
import { test } from "node:test";

import {
    buildSparkSplatOptions,
    SPLAT_SOURCE_MODES,
} from "../../../../shared/splat/splatSource.js";

test("buildSparkSplatOptions keeps normal splats on Spark Quick LoD", () => {
    const plan = buildSparkSplatOptions({
        url: "https://example.test/assets/source.spz",
        fileName: "source.spz",
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.QUICK_LOD);
    assert.equal(plan.paged, false);
    assert.equal(plan.options.lod, true);
    assert.equal(plan.options.paged, undefined);
    assert.equal(plan.options.fileType, "spz");
});

test("buildSparkSplatOptions enables paged loading for streaming RAD variants", () => {
    const plan = buildSparkSplatOptions({
        url: "https://example.test/assets/source-lod.rad",
        fileName: "source-lod.rad",
        variant: "sparkRad",
        variantMeta: {
            format: "spark-rad",
            streaming: true,
            paged: true,
        },
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.RAD_PAGED);
    assert.equal(plan.paged, true);
    assert.equal(plan.options.lod, undefined);
    assert.equal(plan.options.paged, true);
    assert.equal(plan.options.fileType, "rad");
});

test("buildSparkSplatOptions loads non-paged RAD without Quick LoD", () => {
    const plan = buildSparkSplatOptions({
        url: "https://example.test/assets/source.rad",
        fileName: "source.rad",
        variantMeta: {
            format: "spark-rad",
            streaming: false,
            paged: false,
        },
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.RAD);
    assert.equal(plan.options.lod, undefined);
    assert.equal(plan.options.paged, undefined);
    assert.equal(plan.options.fileType, "rad");
});

test("buildSparkSplatOptions keeps forced original on Quick LoD even when asset has RAD metadata", () => {
    const plan = buildSparkSplatOptions({
        url: "https://example.test/assets/source.spz",
        fileName: "source.spz",
        variant: "original",
        variantMeta: {
            status: "ready",
            path: "assets/source.spz",
        },
        manifest: {
            assetKind: "splat",
            lodMeta: {
                splat: {
                    format: "spark-rad",
                    streaming: true,
                    paged: true,
                    radPath: "/assets/source-lod.rad",
                },
            },
            variants: {
                original: { status: "ready", path: "assets/source.spz" },
                sparkRad: {
                    status: "ready",
                    path: "assets/source-lod.rad",
                    format: "spark-rad",
                    streaming: true,
                    paged: true,
                },
            },
        },
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.QUICK_LOD);
    assert.equal(plan.options.lod, true);
    assert.equal(plan.options.paged, undefined);
});

test("buildSparkSplatOptions does not use paged RAD for unsaved file uploads", () => {
    const plan = buildSparkSplatOptions({
        fileBytes: new ArrayBuffer(8),
        fileName: "source-lod.rad",
        fromUpload: true,
        variantMeta: {
            format: "spark-rad",
            streaming: true,
            paged: true,
        },
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.RAD);
    assert.equal(plan.options.lod, undefined);
    assert.equal(plan.options.paged, undefined);
    assert.equal(plan.options.fileType, "rad");
    assert.ok(plan.options.fileBytes instanceof ArrayBuffer);
});

test("buildSparkSplatOptions passes explicit SPZ type for uploads", () => {
    const plan = buildSparkSplatOptions({
        fileBytes: new ArrayBuffer(8),
        fileName: "source.spz",
        fromUpload: true,
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.QUICK_LOD);
    assert.equal(plan.options.lod, undefined);
    assert.equal(plan.options.fileType, "spz");
    assert.ok(plan.options.fileBytes instanceof ArrayBuffer);
});

test("buildSparkSplatOptions maps SOG uploads to Spark's PC-SOGS ZIP type", () => {
    const plan = buildSparkSplatOptions({
        fileBytes: new ArrayBuffer(8),
        fileName: "source.sog",
        fromUpload: true,
    });

    assert.equal(plan.mode, SPLAT_SOURCE_MODES.QUICK_LOD);
    assert.equal(plan.options.lod, undefined);
    assert.equal(plan.options.fileType, "pcsogszip");
    assert.ok(plan.options.fileBytes instanceof ArrayBuffer);
});
