# Gaussian Splats Diagnosis

## Current loading pipeline

HERA currently supports three runtime asset families:

- GLB/GLTF meshes through the existing manifest, variant, simplification, texture-compression, and runtime LOD path.
- Potree point clouds through `@pnext/three-loader` and Potree octree metadata.
- Gaussian Splats through SparkJS.

The Gaussian Splat path is separate from the GLB mesh pipeline and does not replace it.

Viewer flow:

1. `frontend/user/src/js/threeExt/modelManagement/asset.js` fetches the asset manifest and chooses a ready variant.
2. `frontend/user/src/js/threeExt/modelManagement/assetKind.js` delegates type detection to `frontend/shared/assetKinds.js`.
3. If the kind is `splat`, `Asset.load()` calls `frontend/user/src/js/threeExt/spark/sparkSplatLoader.js`.
4. `sparkSplatLoader.js` dynamically imports `@sparkjsdev/spark`, creates a Spark `SplatMesh`, and waits for `splat.initialized`.
5. `frontend/user/src/js/threeExt/scene/arScene.js` adds the loaded object to the current Three.js scene.
6. `frontend/user/src/js/threeExt/project/arSessionManager.js` ensures a Spark `SparkRenderer` exists for the active scene.
7. The normal HERA render loop continues to render the scene through the existing Three.js renderer.

Admin/editor flow:

1. `frontend/admin/src/js/threeExt/editorScene.js` detects uploaded file extensions and uses the PLY classifier when the upload is `.ply`.
2. `frontend/admin/src/js/threeExt/modelManagement/assetManager.js` runs the default node graph.
3. `frontend/admin/src/js/threeExt/graph/defaultAssetGraph.js` wires `InputAsset -> ResolveAssetUrl -> AssetMetric -> Decode`.
4. `frontend/admin/src/js/threeExt/graph/assetPipelineNodes.js` resolves manifest/upload data and calls the resource loader.
5. `frontend/admin/src/js/threeExt/graph/resourceLoader.js` dispatches by asset kind.
6. If the kind is `splat`, `frontend/admin/src/js/threeExt/spark/sparkSplatLoader.js` creates a Spark `SplatMesh`.
7. `assetManager.js` adds the object to the existing editor scene.

## Files involved

Shared asset classification:

- `frontend/shared/assetKinds.js`
- `frontend/shared/pointcloud/plyAssetKind.js`
- `backend/api/src/services/assetKind.js`

Backend manifest / variant handling:

- `backend/api/src/routes/asset.js`
- `backend/api/src/services/gltf/variantSet.js`

Viewer runtime:

- `frontend/user/src/js/threeExt/modelManagement/asset.js`
- `frontend/user/src/js/threeExt/assetManifest.js`
- `frontend/user/src/js/threeExt/scene/arScene.js`
- `frontend/user/src/js/threeExt/project/arSessionManager.js`
- `frontend/user/src/js/threeExt/rendering/arRenderer.js`
- `frontend/user/src/js/threeExt/spark/sparkRuntime.js`
- `frontend/user/src/js/threeExt/spark/sparkSplatLoader.js`

Admin/editor runtime:

- `frontend/admin/src/js/threeExt/editorScene.js`
- `frontend/admin/src/js/threeExt/modelManagement/assetManager.js`
- `frontend/admin/src/js/threeExt/graph/defaultAssetGraph.js`
- `frontend/admin/src/js/threeExt/graph/assetPipelineNodes.js`
- `frontend/admin/src/js/threeExt/graph/resourceLoader.js`
- `frontend/admin/src/js/threeExt/rendering/editorRenderer.js`
- `frontend/admin/src/js/threeExt/spark/sparkRuntime.js`
- `frontend/admin/src/js/threeExt/spark/sparkSplatLoader.js`

Diagnostics added:

- `frontend/shared/splat/splatDiagnostics.js`

## Format classification

Known GLTF mesh extensions are classified as `gltf`.

Known splat extensions are classified as `splat`:

- `.splat`
- `.spz`
- `.ksplat`
- `.ply`
- `.sog`

Known Potree entry files are classified as `pointcloud-streaming`:

- `metadata.json`
- `cloud.js`

The `.ply` case is ambiguous. HERA uses `frontend/shared/pointcloud/plyAssetKind.js` to inspect the header. A PLY with Gaussian-like properties such as `f_dc_`, `f_rest_`, `opacity`, `scale_`, or `rot_` is treated as a splat. A PLY with normal XYZ vertex properties and without enough Gaussian properties is treated as a static point cloud.

## SparkJS integration

Installed package versions:

- `@sparkjsdev/spark`: requested as `^2.1.0`, resolved in package lock as `2.1.0`.
- `three`: requested as `^0.180.0`, resolved in package lock as `0.180.0`.
- SparkJS declares a peer dependency of `three >=0.180.0`, so the installed Three version matches Spark's declared requirement.

Spark is initialized lazily. It is not imported during normal GLB loading. Both viewer and admin call `import("@sparkjsdev/spark")` only when a splat is loaded or when a Spark renderer is needed.

HERA creates one `SparkRenderer` per Three.js scene and attaches it to the same scene. It passes the existing HERA `WebGLRenderer` into Spark. No second Three renderer, second WebGL context, or duplicate animation loop was found in the current Spark path.

The Spark object is added to the same Three scene as GLB and Potree assets. It uses the same camera, controls, renderer, and render loop. Scene lights exist in the same scene, but splats are not mesh materials and should not be expected to respond to lights the same way GLBs do.

Current Spark options:

```js
new SparkRenderer({
    renderer,
    maxStdDev: Math.sqrt(6),
    maxPixelRadius: 160,
    minSortIntervalMs: 50,
});

new SplatMesh({
    url or fileBytes,
    fileName,
    lod: true,
    raycastable: false,
});
```

## Why splats are probably heavy

The main confirmed issue is that HERA's mature optimization path is GLB/Potree-specific. Splats are loaded as one Spark `SplatMesh`; they do not currently have HERA-generated LOD variants, server-side simplification, texture compression, octree streaming, or a point budget equivalent.

Important confirmed differences:

- GLB assets can use variants from the manifest (`original`, simplified variants, compressed textures, etc.).
- Potree point clouds use an octree and `pointBudget`, so they stream and render only a visible subset.
- Spark splats currently rely only on Spark's own `lod: true` behavior. HERA does not generate or choose multiple splat quality variants.

Likely cost centers:

- Full-resolution splat files are decoded into GPU data.
- Transparent splats require ordering/sorting to look correct.
- `minSortIntervalMs: 50` allows Spark sorting up to roughly 20 times per second.
- The viewer enables OrbitControls auto-rotation after camera fitting, which keeps the camera moving and can force repeated sort updates.
- Renderer pixel ratio uses full `window.devicePixelRatio`; on phones this can be expensive because splats are fragment-heavy.
- `antialias: true` is enabled on HERA renderers. Spark's own types/documentation note that MSAA does not improve Gaussian splatting much and can significantly reduce performance.
- Shadows are enabled globally, and `Asset.load()` currently marks every loaded object as `castShadow` and `receiveShadow`, including splats.

No evidence was found that HERA intentionally creates duplicate Spark renderers per scene. However, repeated editor upload/reload flows should be audited for disposal because removing a Spark object from the scene may not be enough to release all Spark GPU allocations.

## Why visual quality may be poor

Visual quality may be poor for a few separate reasons:

- Splats are not lit like GLB mesh materials, so existing HERA scene lights do not improve them like they improve meshes.
- HERA renderers do not explicitly set `outputColorSpace`, `toneMapping`, or `toneMappingExposure`. If Spark input colors expect a different color pipeline, the result can appear too dark, washed out, or inconsistent with GLBs.
- Splat transparency depends on sorting. If camera movement triggers expensive or delayed sorting, the image can look unstable, noisy, or incorrectly layered.
- Scale, center, or orientation problems can make a splat look blurry or hard to inspect because the camera fit and clipping assumptions were originally mesh-oriented.
- Renderer DPR and alpha/antialias setup can make mobile splats slower without making them visibly better.

## Concrete issues found

P0-level findings:

- There is no HERA splat LOD/variant strategy. Manifest variants for non-GLTF assets only keep `original` ready and mark simplification variants unsupported.
- Potree has an explicit streaming budget; splats do not have a HERA-level splat budget.
- The viewer perf debug logger existed but was not called in the WebXR render loop. It is now called, still gated by `?perfDebug=1`.

P1-level findings:

- `Asset.load()` applies shadow flags to all asset kinds, including splats.
- Full device pixel ratio is used on mobile. This is expensive for splats.
- Antialias is enabled on the WebGL renderer even though it is not a strong fit for Gaussian splatting performance.
- OrbitControls auto-rotation can keep splat sorting active.
- Spark disposal is not explicit in the editor removal/reload path.
- Renderer color management is not explicit, making visual consistency harder to reason about.

P2-level findings:

- Backend metrics do not count splats. Runtime diagnostics can infer splat count if Spark exposes it, but there is no server-side splat metadata pipeline yet.
- `.ply` classification is reasonable but still heuristic. The app should keep explicit kind overrides in manifests/uploads.
- No dedicated splat debug UI exists. Console diagnostics are enough for investigation, but not for a polished production workflow.

## Diagnostics added

New opt-in diagnostics are available with either flag:

- `?splatDebug=1`
- `?perfDebug=1`

They log only when enabled.

Logged fields include:

- asset id, name, kind, source URL, extension, file size when available
- Spark package name and exported version when accessible
- load start/end timing
- Spark object type and initialization state
- splat count when Spark exposes a readable field/method
- bounding box, center, size, and radius when available
- position, rotation, scale
- renderer pixel ratio, color settings, shadows, XR status, and renderer memory counters
- warnings for high DPR, high splat count, empty bounds, huge radius, or disabled Spark LOD

Existing optional performance tools remain available:

- `?perfDebug=1` for periodic renderer stats in the console.
- `?arMetrics=1&arMetricsConsole=1` for the existing AR metrics collector.
- `?arMetricsWebglErrors=1` to poll WebGL errors through the existing metrics collector.

## Comparison with Potree

Potree is more stable for large point clouds because it is built around an octree:

- The backend stores/serves Potree metadata and binary hierarchy.
- The frontend loader receives a `pointBudget`.
- Potree selects visible octree nodes based on camera/frustum and budget.
- Far or off-screen data is not rendered at full detail.
- Runtime stats can report visible nodes, visible points, loaded nodes, total points, and budget.

Current splats are different:

- HERA does not build a splat octree.
- HERA does not generate multiple splat LOD files.
- HERA does not enforce a splat count budget.
- Spark may do internal LOD when `lod: true`, but HERA is not currently controlling or measuring it as a first-class runtime LOD system.

So the honest diagnosis is: Potree has a complete streaming LOD architecture; splats currently have a minimal Spark integration plus Spark's internal behavior.

## Recommended fixes

P0, must fix now:

- Keep Spark integration isolated behind the existing asset-kind/resource-loader paths.
- Use the new diagnostics with real splat assets before changing renderer behavior.
- Measure at least file size, load time, first stable render, FPS/frame time, splat count, renderer DPR, and Spark object bounds on phone and desktop.
- Add explicit Spark disposal in editor/viewer asset removal paths if Spark exposes `dispose()`.

P1, should fix before demo:

- Disable mesh-style shadow flags for splat assets.
- Stop camera auto-rotation for splats, or make it opt-in, to reduce constant sort pressure.
- Decide a mobile DPR cap for splat scenes based on measurement.
- Test renderer antialias off for splat-heavy scenes.
- Set and document renderer color management (`outputColorSpace`, tone mapping, exposure) after comparing GLB, Potree, and Spark output.
- Convert demo splats to a web-friendly compressed format such as `.spz` if Spark performs better with it than raw `.ply` or `.splat`.

P2, later optimization:

- Add backend splat metadata extraction: splat count, bounds, file format, compression state.
- Add manifest fields for splat quality variants.
- Add a real splat LOD/quality selector, separate from GLB simplification.
- Add debug UI controls for splat scale/exposure/gamma only after the console diagnostics prove which visual problem is happening.
- Evaluate other splat runtimes only if Spark cannot meet demo requirements after measured tuning.

## Demo guidance

What can be shown honestly now:

- HERA can classify and render Gaussian Splat assets through SparkJS.
- The integration uses HERA's existing Three renderer, scene, camera, controls, and render loop.
- GLB and Potree pipelines are still separate and untouched.
- Splats are currently experimental and do not yet have the same optimization maturity as Potree or GLB variants.

What should not be claimed yet:

- Do not claim splats have Potree-like streaming.
- Do not claim HERA has production splat LOD.
- Do not claim mobile splat performance is solved.
- Do not claim visual quality is final until color management, scale, sorting, DPR, and compression are measured on target devices.
