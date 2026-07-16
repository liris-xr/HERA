import assert from "node:assert/strict";
import { test } from "node:test";

import {
    isModernSpzBytes,
    shouldUseModernSpzFallback,
} from "../../../../shared/splat/modernSpzFallback.js";

test("isModernSpzBytes detects raw NGSP SPZ files", () => {
    assert.equal(isModernSpzBytes(new Uint8Array([0x4e, 0x47, 0x53, 0x50, 4, 0, 0, 0])), true);
    assert.equal(isModernSpzBytes(new Uint8Array([0x1f, 0x8b, 8, 0])), false);
});

test("shouldUseModernSpzFallback handles Spark gzip failures for SPZ", () => {
    assert.equal(shouldUseModernSpzFallback({
        error: new Error("Invalid gzip header"),
        fileName: "scan.spz",
    }), true);
    assert.equal(shouldUseModernSpzFallback({
        error: new Error("Invalid gzip header"),
        fileName: "scan.splat",
    }), false);
});

test("shouldUseModernSpzFallback does not hijack legacy gzip SPZ uploads", () => {
    assert.equal(shouldUseModernSpzFallback({
        fileName: "scan.spz",
        fileBytes: new Uint8Array([0x1f, 0x8b, 8, 0]),
    }), false);
});
