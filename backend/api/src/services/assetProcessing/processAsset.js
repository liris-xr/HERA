import {simplifyAsset} from "../gltf/simplifyAsset.js";


export async function processAsset({ asset, strategy, params = {}, apiRoot }) {
    switch (strategy) {
        case "simplify":
            return await simplifyAsset({ asset, params, apiRoot });

        default:
            throw new Error(`Unknown processing strategy: ${strategy}`);
    }
}