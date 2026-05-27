const SPARK_RENDERER_KEY = "heraSparkRenderer";

export function sceneHasSparkContent(scene) {
    let hasSparkContent = false;

    scene?.traverse?.((object) => {
        if (object?.userData?.heraAssetKind === "splat") {
            hasSparkContent = true;
        }
    });

    return hasSparkContent;
}

export async function ensureSparkRenderer({ renderer, scene, force = false }) {
    //crée sparkRenderer par scène, réutilise le renderer three.js déjà existant dans HERA => pas de 2eùe boucle de rendu
    if (!renderer || !scene) return false;
    if (scene.userData?.[SPARK_RENDERER_KEY]) return true;
    if (!force && !sceneHasSparkContent(scene)) return false;

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
