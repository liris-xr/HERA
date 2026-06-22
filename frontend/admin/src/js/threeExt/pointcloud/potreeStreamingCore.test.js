import assert from "node:assert/strict";
import { test } from "node:test";

import { createPotreeStreamingLoader } from "../../../../../shared/pointcloud/potreeStreamingCore.js";

const pointCloud = {
    material: {},
    minNodePixelSize: 0,
    pcoGeometry: { numPoints: 10 },
};

const THREE = {
    Group: class {
        constructor() {
            this.children = [];
            this.userData = {};
        }

        add(child) {
            this.children.push(child);
        }

        clear() {
            this.children = [];
        }
    },
    MathUtils: {
        clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        },
    },
};

test("Potree range requests are sliced when the server returns the whole file", async () => {
    const previousFetch = globalThis.fetch;

    try {
        const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        globalThis.fetch = async () => new Response(bytes, { status: 200 });

        let resolvedChunkUrl = null;
        let returnedRange = null;

        class Potree {
            constructor(version) {
                this.version = version;
                this.pointBudget = 0;
            }

            async loadPointCloud(entryName, getUrl, request) {
                assert.equal(entryName, "metadata.json");
                resolvedChunkUrl = getUrl("octree.bin");

                const response = await request(resolvedChunkUrl, {
                    headers: { Range: "bytes=2-5" },
                });

                returnedRange = {
                    status: response.status,
                    bytes: [...new Uint8Array(await response.arrayBuffer())],
                };

                return pointCloud;
            }

            updatePointClouds() {
                return null;
            }
        }

        const { loadPotreeStreamingPointCloud } = createPotreeStreamingLoader({
            THREE,
            Potree,
            PointColorType: { RGB: "rgb" },
            PointShape: { SQUARE: "square" },
            PointSizeType: { ADAPTIVE: "adaptive" },
            resolveResourceUrl: (url) => `https://assets.test/${String(url).replace(/^\/+/, "")}`,
        });

        const loaded = await loadPotreeStreamingPointCloud({
            url: "/public/scan/metadata.json",
            name: "scan",
        });

        assert.equal(resolvedChunkUrl, "https://assets.test/public/scan/octree.bin");
        assert.deepEqual(returnedRange, {
            status: 206,
            bytes: [2, 3, 4, 5],
        });
        assert.equal(loaded.pointCloud, pointCloud);
    } finally {
        globalThis.fetch = previousFetch;
    }
});
