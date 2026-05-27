const SPARK_RENDERER_KEY = "heraSparkRenderer";

export async function ensureSparkRenderer({ renderer, scene, force = false }) {
    if (!renderer || !scene) return false;
    if (scene.userData?.[SPARK_RENDERER_KEY]) return true;
    if (!force) return false;

    const { SparkRenderer } = await import("@sparkjsdev/spark");

    const sparkRenderer = new SparkRenderer({
        renderer,
        maxStdDev: Math.sqrt(6),
        maxPixelRadius: 160,
        minSortIntervalMs: 50,
    });

    sparkRenderer.name = "HERA Spark Renderer";
    sparkRenderer.userData.heraSparkRenderer = true;

    scene.add(sparkRenderer);
    scene.userData[SPARK_RENDERER_KEY] = sparkRenderer;

    return true;
}
