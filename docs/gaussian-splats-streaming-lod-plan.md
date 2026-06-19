# Gaussian Splats Streaming LoD Plan

## Conclusion

HERA currently uses Spark Quick LoD only. It does not use Spark's real streamable LoD path yet.

Current HERA code creates splats like this:

```js
new SplatMesh({
    url,
    fileName,
    lod: true,
    raycastable: false,
});
```

That is useful, but it is not the recommended Spark 2.x streaming workflow. According to the Spark docs, `lod: true` first loads the splat file and then builds a LoD version in a background worker. Spark's recommended faster/streaming path is to prebuild a `.rad` LoD file with `build-lod` and load it as:

```js
new SplatMesh({
    url: "./my-splats-lod.rad",
    paged: true,
});
```

Best solution for HERA: preprocess uploaded splats into Spark `.rad` LoD assets, store the `.rad` as the preferred optimized/streaming variant, and load `.rad` with `paged: true`.

## Sources checked

Official Spark docs:

- https://sparkjs.dev/docs/lod-getting-started/
- https://sparkjs.dev/docs/new-spark-renderer/
- https://sparkjs.dev/docs/loading-splats/
- https://sparkjs.dev/docs/performance/

Installed package:

- `frontend/user/node_modules/@sparkjsdev/spark/package.json`
- `frontend/user/node_modules/@sparkjsdev/spark/README.md`
- `frontend/user/node_modules/@sparkjsdev/spark/dist/types/*.d.ts`
- `frontend/user/node_modules/@sparkjsdev/spark/dist/spark.module.js.map`

HERA files:

- `frontend/user/src/js/threeExt/spark/sparkSplatLoader.js`
- `frontend/admin/src/js/threeExt/spark/sparkSplatLoader.js`
- `frontend/user/src/js/threeExt/spark/sparkRuntime.js`
- `frontend/admin/src/js/threeExt/spark/sparkRuntime.js`
- `frontend/shared/assetKinds.js`
- `backend/api/src/services/assetKind.js`
- `backend/api/src/services/gltf/variantSet.js`
- `backend/api/src/routes/asset.js`
- `backend/api/app.js`

## `lod: true` vs streamable LoD

`lod: true`:

- Works with normal splat formats such as `.ply`, `.spz`, `.splat`, `.ksplat`, and `.sog`.
- Loads the input file first.
- Builds a LoD tree in a background WebWorker.
- Spark docs estimate roughly 1-3 seconds per 1M input splats to create the LoD version.
- Can handle large inputs, but initial download/decode/build still costs time and memory.
- Produces `packedSplats.lodSplats` or `extSplats.lodSplats` in memory.
- Does not stream chunks from the server on demand.

Streamable `.rad` LoD:

- Is Spark's prebuilt LoD file format.
- Encodes the LoD tree offline.
- Can load directly without `lod: true`.
- Uses `paged: true` for instant/progressive loading.
- Uses `PagedSplats` and `SplatPager` internally.
- Has a renderer-side page pool budget via `SparkRenderer.maxPagedSplats`.
- Fetches only needed chunks based on LoD traversal.
- Uses HTTP Range requests for monolithic `.rad` files.
- Can also use chunked `.rad + .radc` output, where the `.rad` is a small header and chunks are separate `.radc` files.

## Whether HERA currently uses real Spark streaming LoD

No.

Confirmed current behavior:

- User viewer `frontend/user/src/js/threeExt/spark/sparkSplatLoader.js` creates `SplatMesh` with `lod: true`.
- Admin/editor `frontend/admin/src/js/threeExt/spark/sparkSplatLoader.js` also creates `SplatMesh` with `lod: true`.
- Neither path passes `paged: true`.
- Neither path uses `SplatPager` directly.
- HERA does not classify `.rad` as a splat extension.
- HERA does not classify `.radc`.
- HERA does not generate `.rad`.
- HERA manifests do not expose a `.rad` streaming variant.
- Backend processing endpoints currently reject non-GLTF assets for simplification/processing.
- Backend upload treatment keeps Gaussian splat `.ply` files in the splat pipeline; it does not convert them to Spark `.rad`.

## Spark `.rad` support in installed version

Installed versions:

- `@sparkjsdev/spark`: `2.1.0`
- `three`: `0.180.0`

Spark 2.1.0 supports `.rad` at runtime:

- `SplatFileType.RAD = "rad"` exists in `dist/types/defines.d.ts`.
- `getSplatFileTypeFromPath()` recognizes `.rad`.
- `getSplatFileType()` recognizes RAD magic bytes.
- `SplatMeshOptions` has `paged?: boolean | PagedSplats | SplatPager`.
- `PagedSplats` supports `rootUrl`, `fileBytes`, `requestHeader`, and `withCredentials`.
- `SplatPager` exposes `maxSplats` and `numFetchers`.

Important packaging issue:

- The published npm package metadata contains a `build-lod` script.
- The installed npm package has `"files": ["dist"]`.
- The installed package does not include `rust/build-lod/Cargo.toml`.
- Therefore `npm run build-lod` from the installed package is not directly usable in HERA's current `node_modules`.
- To run `build-lod`, HERA needs either the Spark source repo checked out as a backend tool dependency, a separately built `build-lod` binary, or a controlled container/tool image containing the Spark source and Rust build output.

## How `.rad` is generated

Official Spark docs show:

```bash
npm run build-lod -- my-splats.ply more-splats.spz --quality
```

Expected output:

- `my-splats-lod.rad`
- `more-splats-lod.rad`

Important options:

- `--quick`: fast `tiny-lod` method, default.
- `--quality`: slower, higher quality `bhatt-lod`; recommended for offline LoD building and streaming.
- `--max-sh=#`: limit SH bands from 0 to 3.
- `--rad-chunked`: output small `.rad` header plus `.radc` chunks.
- `--csplat` / `--gsplat`: compact or higher precision encoding.
- `--unlod`: remove LoD nodes with children.

Supported input formats according to Spark docs:

- `.ply`, including PlayCanvas compressed PLY
- `.spz`
- `.splat`
- `.ksplat`
- `.sog`
- `.zip` containing SOGS files

## How Spark loads `.rad`

Direct non-paged load:

```js
new SplatMesh({ url: "./my-splats-lod.rad" });
```

Paged streaming load:

```js
new SplatMesh({
    url: "./my-splats-lod.rad",
    paged: true,
});
```

For `paged: true`, Spark creates/uses `PagedSplats`. During renderer updates, `SparkRenderer` creates a shared `SplatPager` when paged splats are visible.

Relevant Spark renderer defaults from 2.1.0:

- `enableLod`: true by default.
- `enableDriveLod`: follows `enableLod` by default.
- `enableLodFetching`: true by default.
- `lodSplatCount`: auto platform-based budget unless explicitly set.
- `lodSplatScale`: default 1.0.
- `maxPagedSplats`: default pages are 96 on iOS, 128 on other mobile, 256 on desktop, each page 65,536 splats.
- `numLodFetchers`: default 3.

Runtime behavior:

- For monolithic `.rad`, Spark reads the header by fetching byte ranges from the start of the file.
- It then fetches individual chunks with byte ranges based on the RAD metadata.
- For chunked `.rad`, the header contains chunk filenames and Spark fetches those `.radc` files.

## HTTP Range requirement

Spark's `fetchRange()` sets:

```http
Range: bytes=start-end
```

For monolithic `.rad`, HERA must serve `206 Partial Content` correctly for byte-range requests. For chunked `.rad + .radc`, the initial `.rad` still needs to be fetched; individual `.radc` files may be fetched whole or via range depending on metadata.

HERA currently serves assets via:

```js
app.use("/public", express.static("public"));
```

Express static serving is likely compatible with Range requests, because it uses Node/send-style static file serving. However, this must be tested explicitly on HERA with:

```bash
curl -I -H "Range: bytes=0-1023" https://localhost:8080/public/files/.../assets/my-splats-lod.rad
```

Expected result:

- HTTP `206`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-1023/...`

If HERA later serves assets through authenticated routes, proxies, CDN, compression middleware, or zip wrappers, Range support must be re-verified there too.

## Local files, uploaded assets, backend-served assets

Backend-served persisted assets:

- Best fit for `.rad` streaming.
- Use URL loading with `paged: true`.
- Requires `.rad` and optional `.radc` files stored under `public/files/<project>/assets/...`.
- Requires Range-compatible serving.

Admin local uploaded files before save:

- Current admin loader uses `fileBytes` for unsaved uploads.
- Spark `PagedSplats` can parse a monolithic `.rad` from `fileBytes`, but that means the full file is already in memory and is not network streaming.
- Spark explicitly rejects chunked RAD with `fileBytes`.
- Therefore true streaming should be used only after the asset is saved/processed and served by URL.

Local browser File objects:

- Not useful for real streaming. A local `File` can be sliced, but HERA's current Spark path passes `fileBytes`; it does not expose a Range-like URL.
- For demo/testing, local `.rad` can prove compatibility, but not server streaming.

WebXR/AR:

- Spark works with HERA's existing renderer and render loop.
- SparkRenderer explicitly handles `renderer.xr.isPresenting` by using `renderer.xr.getCamera()`.
- This suggests paged LoD should work in WebXR, but it needs on-device testing because chunk fetching, LoD traversal, GPU page uploads, and sorting can still cause frame spikes.

## HERA backend changes needed

Add a splat processing service, separate from GLB optimization and Potree conversion:

- `backend/api/src/services/splat/sparkLodBuilder.js`
- Detect splat inputs: `.ply`, `.spz`, `.splat`, `.ksplat`, `.sog`.
- Run a configured external `build-lod` binary/tool.
- Prefer `--quality` for offline processing.
- Consider `--rad-chunked` for large scenes.
- Store outputs beside the original upload.
- Persist metadata in `asset.lodMeta`.

Suggested `lodMeta` shape:

```json
{
  "assetKind": "splat",
  "splat": {
    "format": "spark-rad",
    "streaming": true,
    "generator": "spark-build-lod",
    "sparkVersion": "2.1.0",
    "sourcePath": "/public/files/project/assets/source.spz",
    "radPath": "/public/files/project/assets/source-lod.rad",
    "chunked": false,
    "chunkPaths": [],
    "buildOptions": {
      "quality": true,
      "maxSh": 3
    }
  },
  "original": {
    "path": "/public/files/project/assets/source.spz",
    "status": "ready"
  },
  "variants": {
    "sparkRad": {
      "path": "/public/files/project/assets/source-lod.rad",
      "status": "ready",
      "streaming": true
    }
  }
}
```

Backend must not reuse GLB simplification endpoints blindly. This should be a new splat-specific processing path.

## Frontend changes needed

Asset kind/classification:

- Add `.rad` to splat extensions in `frontend/shared/assetKinds.js`.
- Add `.rad` to splat extensions in `backend/api/src/services/assetKind.js`.
- Add `.rad` to admin upload supported extensions.
- Consider `.radc` as associated chunk files, not a directly selectable asset entry.

Loader behavior:

- In `frontend/user/src/js/threeExt/spark/sparkSplatLoader.js`, choose options based on file extension or manifest metadata.
- If selected variant is `.rad` or `manifest.lodMeta.splat.streaming === true`, use:

```js
new SplatMesh({
    url,
    fileName,
    paged: true,
    raycastable: false,
});
```

- For normal `.ply/.spz/.splat/.ksplat/.sog`, keep:

```js
new SplatMesh({
    url,
    fileName,
    lod: true,
    raycastable: false,
});
```

SparkRenderer options:

- Keep one SparkRenderer per scene.
- Add explicit options only after measurement:
  - `lodSplatScale`
  - `maxPagedSplats`
  - `numLodFetchers`
  - `pagedExtSplats` for huge-coordinate assets
- Avoid global mobile policy changes until measured.

Admin behavior:

- For unsaved local uploads, keep current preview path.
- After save/backend processing, reload from manifest and use the `.rad` URL if available.
- Display processing status for RAD conversion.

## Manifest and variant changes needed

Current `buildVariantSet()` marks every non-GLTF asset as:

- `original`: ready
- `simplified`: unsupported
- `n1/n2/n3`: unsupported

That is too GLB-centric for Spark RAD.

Minimal clean change:

- Keep GLB variant names untouched.
- For splats, add a splat-specific variant key such as `sparkRad` or `streaming`.
- Let `preferredVariant` reference that key.
- Update `pickVariantFromManifest()` only if it currently assumes fixed variant keys.

Suggested variant response for splats:

```json
{
  "assetKind": "splat",
  "preferredVariant": "sparkRad",
  "variants": {
    "original": {
      "status": "ready",
      "path": "/public/files/.../source.spz"
    },
    "sparkRad": {
      "status": "ready",
      "path": "/public/files/.../source-lod.rad",
      "format": "spark-rad",
      "streaming": true
    }
  }
}
```

Do not overload GLB `n1/n2/n3` semantics for splats.

## Path comparison

### Path A, keep current files and `lod: true`

Pros:

- Already implemented.
- No backend processing.
- Works for quick feasibility tests.
- Good enough for small splats.

Cons:

- Full input download still happens.
- Full decode still happens.
- LoD tree is built on the client after load.
- Initial load can be slow and memory-heavy.
- Bad fit for normal phones and WebXR demos with large scenes.

Use when:

- Assets are small.
- You only need local feasibility.
- You do not need instant load or stable mobile performance.

### Path B, Spark `.rad` streamable LoD preprocessing

Pros:

- Matches Spark's recommended streaming workflow.
- Avoids client-side LoD build.
- Supports progressive/paged loading.
- Gives Spark a real splat budget through `SplatPager`.
- Best fit for large scenes, mobile, and AR.

Cons:

- Requires a backend processing toolchain.
- Installed npm package does not include the Rust `build-lod` source.
- Requires Range-compatible serving.
- Requires manifest changes.
- Needs real device testing.

Use when:

- Target is demo-quality mobile/WebXR.
- Assets are more than small toy splats.
- You need repeatable performance.

### Path C, generate multiple splat quality variants

Pros:

- Conceptually similar to current GLB variants.
- Easier to reason about if `build-lod` tooling is hard to deploy.
- Can provide a mobile fallback.

Cons:

- Not true streaming.
- Still loads one full chosen file.
- Requires a separate simplification/conversion strategy.
- May be lower quality than Spark's LoD tree.

Use when:

- `.rad` toolchain is blocked.
- You need a short-term fallback for demo.

### Path D, Potree for point clouds, splats experimental

Pros:

- Potree path already has streaming/octree/point budget.
- Safer for point-cloud-heavy demos.
- Avoids pretending Spark splat mobile performance is solved.

Cons:

- Point clouds are not Gaussian splats.
- Visual fidelity and use case differ.
- Does not solve splat rendering.

Use when:

- Demo deadline is close.
- RAD processing cannot be validated in time.

## Risks

- The Spark npm package does not ship `rust/build-lod`, so backend integration needs an external tool/binary.
- Range support must be tested through the exact HERA deployment path, not assumed.
- Chunked `.rad + .radc` needs file copying/deletion/import/export logic so chunks do not orphan.
- Admin unsaved upload previews cannot prove real network streaming.
- WebXR may still show frame spikes during chunk decode/upload.
- Very large coordinate scenes may need `pagedExtSplats: true`, which costs memory/perf.
- HERA's manifest system is currently GLB-variant oriented.

## P0 plan

- Add `.rad` to splat classification in frontend shared and backend asset kind detection.
- Add `.rad` to admin upload supported extensions.
- Add diagnostics that log whether a splat is `quick-lod` or `spark-rad-paged`.
- Manually generate one `.rad` outside HERA using Spark source repo or a built `build-lod` binary.
- Place the `.rad` under `backend/api/public/files/.../assets/`.
- Test Range with `curl`.
- Temporarily force one known RAD asset to load with `paged: true` in a local experiment branch.
- Measure phone FPS, load time, first visual, network chunks, and console errors.

## P1 plan

- Add backend splat RAD processing as a first-class service.
- Store `.rad` metadata in `lodMeta.splat`.
- Extend manifest variants with `sparkRad`.
- Make the viewer prefer `sparkRad` when ready, fall back to original quick LoD.
- Use `paged: true` only for `.rad`.
- Keep `lod: true` for normal non-RAD splats.
- Add cleanup logic for `.rad` and `.radc` outputs.
- Add tests for `.rad` detection and manifest variant selection.

## P2 plan

- Add async processing status in admin UI.
- Add per-asset Spark tuning metadata: `lodScale`, `maxSh`, `pagedExtSplats`, `chunked`.
- Add automated Range request test in backend integration tests.
- Add benchmark fixtures for small/medium/large splats.
- Evaluate non-RAD fallback variants if build-lod is unstable in deployment.

## Safe small changes to implement later

These are low-risk and can be done before the full backend RAD pipeline:

- Add `.rad` to `SPLAT_EXTENSIONS` in shared frontend detection.
- Add `.rad` to backend `SPLAT_EXTENSIONS`.
- Add `.rad` to admin `SUPPORTED_ASSET_EXTENSIONS` and `SPLAT_ASSET_EXTENSIONS`.
- Update splat debug logs to include:
  - `streamingMode: "quick-lod" | "spark-rad-paged" | "plain"`
  - `isRad: true/false`
  - `paged: true/false`
- Do not add `.radc` as a normal user-uploadable asset type; treat it as a sidecar chunk.

## Implementation note: optional Spark RAD support

HERA now supports `.rad` as an optional optimized variant for splat assets without making Spark RAD generation mandatory.

Frontend behavior:

- Existing `.ply`, `.spz`, `.splat`, `.ksplat`, and `.sog` splats still load through Spark Quick LoD with `lod: true`.
- If the manifest exposes a ready `sparkRad` variant, splat assets prefer that variant.
- If the selected source is a streamable `.rad`, HERA loads it with `new SplatMesh({ url, paged: true })`.
- If the selected source is a non-streaming `.rad` or an unsaved local `.rad` upload, HERA loads it without `lod: true`.
- If runtime RAD loading fails and the manifest still has a ready original splat path, HERA logs `[HERA][SplatSource] falling back to original splat` and retries the original with `lod: true`.

Backend behavior:

- Splat RAD generation is best-effort and controlled by `SPARK_BUILD_LOD_PATH`.
- HERA does not assume the installed `@sparkjsdev/spark` npm package contains the `build-lod` tool.
- If `SPARK_BUILD_LOD_PATH` is missing, invalid, times out, fails, or produces no `.rad`, upload still succeeds with the original splat.
- Generated `.rad` files are stored beside the original upload and exposed in `lodMeta.variants.sparkRad`.
- Generated `.radc` sidecar files are preserved beside the `.rad` and listed in `lodMeta.splat.chunkPaths`.

Environment variables:

```bash
SPARK_BUILD_LOD_PATH=/absolute/path/to/build-lod
SPARK_BUILD_LOD_ARGS="--quality"
SPARK_BUILD_LOD_TIMEOUT_MS=600000
```

On Windows PowerShell:

```powershell
$env:SPARK_BUILD_LOD_PATH="C:\path\to\build-lod.exe"
$env:SPARK_BUILD_LOD_ARGS="--quality"
$env:SPARK_BUILD_LOD_TIMEOUT_MS="600000"
```

Recommended Windows developer setup:

```powershell
winget install Rustlang.Rustup
```

Open a new PowerShell window after installing Rust, then run from the HERA repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-spark-build-lod.ps1
```

The setup script:

- Clones the official Spark source repository because the npm package only ships `dist`.
- Checks out Spark `v2.1.0`, matching HERA's installed `@sparkjsdev/spark`.
- Builds `rust/build-lod/Cargo.toml` with Cargo in release mode.
- Writes `.hera-tools\spark-build-lod.env.ps1` with the environment variables HERA needs.

Default output path on this workspace:

```powershell
C:\Users\ajili\HERA\.hera-tools\spark\rust\target\release\build-lod.exe
```

After setup, start the backend from a PowerShell session where these variables are set:

```powershell
$env:SPARK_BUILD_LOD_PATH="C:\Users\ajili\HERA\.hera-tools\spark\rust\target\release\build-lod.exe"
$env:SPARK_BUILD_LOD_ARGS="--quality"
$env:SPARK_BUILD_LOD_TIMEOUT_MS="600000"
```

Equivalent shortcut:

```powershell
. .\.hera-tools\spark-build-lod.env.ps1
```

To test the converter during setup, pass a splat path explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-spark-build-lod.ps1 -TestSplat "C:\path\to\small-splat.spz"
```

Or test one existing uploaded splat from this workspace:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-spark-build-lod.ps1 -TestSplat "C:\Users\ajili\HERA\backend\api\public\files\9288b3c3-dba1-46f7-aed9-afe5ebc39ed4\assets\asset17804981078820.ply"
```

Once configured, an upload with `.spz`, `.splat`, `.ksplat`, `.sog`, or Gaussian `.ply` should produce backend logs like:

```text
[HERA][SparkRad] start
[HERA][SparkRad] done
```

The manifest should then expose:

```json
{
  "variants": {
    "sparkRad": {
      "status": "ready",
      "format": "spark-rad",
      "streaming": true,
      "paged": true
    }
  }
}
```

With `?splatDebug=1`, the viewer should log `[HERA][SplatSource] using paged .rad` for that asset. If conversion is skipped or fails, HERA still keeps the original splat and the viewer uses the original `lod: true` fallback.

To use chunked RAD output, set:

```bash
SPARK_BUILD_LOD_ARGS="--quality --rad-chunked"
```

Range support check for a persisted RAD asset:

```bash
curl -I -H "Range: bytes=0-1023" "https://localhost:8080/public/files/<project-id>/assets/<asset-name>-lod.rad"
```

Expected for monolithic paged RAD:

- `206 Partial Content`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-1023/...`

For chunked RAD, also verify the `.radc` sidecars are reachable under the same static `/public/files/.../assets/` directory.
