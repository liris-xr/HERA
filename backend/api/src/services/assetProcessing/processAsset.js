import { compressTexturesAsset } from "../gltf/compressTexturesAsset.js";
import { optimizeAsset } from "../gltf/optimizeAsset.js";
import {simplifyAsset} from "../gltf/simplifyAsset.js";
import { planAssetOptimization } from "./optimizationPlan.js";

const PROCESSING_STRATEGIES = {
    optimizationPlan: planAssetOptimization,
    optimizeAsset,
    simplify: simplifyAsset,
    compressTextures: compressTexturesAsset,
};

export async function processAsset({ asset, strategy, params = {}, apiRoot }) {
    const handler = PROCESSING_STRATEGIES[strategy];

    if (!handler) {
        throw new Error(`Unknown processing strategy: ${strategy}`);
    }

    return await handler({ asset, params, apiRoot });
}
