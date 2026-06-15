import { buildSplatDebugPayload, logSplatDebug } from "@shared/splat/splatDiagnostics.js";

const SPARK_RENDERER_KEY = "heraSparkRenderer";

export async function ensureSparkRenderer({ renderer, scene, force = false }) {
    if (!renderer || !scene) return false;
    if (scene.userData?.[SPARK_RENDERER_KEY]) return true;
    if (!force) return false;

    const sparkModule = await import("@sparkjsdev/spark");
    const { SparkRenderer } = sparkModule;
    const options = {
        renderer,
        maxStdDev: Math.sqrt(6),
        maxPixelRadius: 160,
        minSortIntervalMs: 50,
    };

    const sparkRenderer = new SparkRenderer(options);

    sparkRenderer.name = "HERA Spark Renderer";
    sparkRenderer.userData.heraSparkRenderer = true;

    scene.add(sparkRenderer);
    scene.userData[SPARK_RENDERER_KEY] = sparkRenderer;

    logSplatDebug("admin-spark-renderer-created", buildSplatDebugPayload({
        renderer,
        sparkModule,
        options: {
            maxStdDev: options.maxStdDev,
            maxPixelRadius: options.maxPixelRadius,
            minSortIntervalMs: options.minSortIntervalMs,
        },
        source: {
            sceneName: scene.name ?? null,
            sceneType: scene.type ?? null,
            noSecondRenderer: true,
            noSecondRenderLoop: true,
        },
    }));

    return true;
}
