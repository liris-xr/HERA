import {
    InputAssetNode,
    ResolveAssetUrlNode,
    DecodeNode,
    RenderNode,
    AssetMetricNode,
    SimplificationPolicyNode
} from "./assetPipelineNodes.js";

export function createDefaultAssetGraph() {
    return [
        InputAssetNode(),
        ResolveAssetUrlNode(),
        AssetMetricNode(),
        SimplificationPolicyNode(),
        DecodeNode(),
        RenderNode(),
    ];
}