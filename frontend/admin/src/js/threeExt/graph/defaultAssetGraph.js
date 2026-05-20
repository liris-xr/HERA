import {
    InputAssetNode,
    ResolveAssetUrlNode,
    DecodeNode,
    AssetMetricNode
} from "./assetPipelineNodes.js";

export function createDefaultAssetGraph() {
    return [
        InputAssetNode(),
        ResolveAssetUrlNode(),
        AssetMetricNode(),
        DecodeNode(),
    ];
}
