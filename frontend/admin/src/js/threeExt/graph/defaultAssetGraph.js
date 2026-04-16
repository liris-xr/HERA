import {
    InputAssetNode,
    ResolveAssetUrlNode,
    DecodeNode,
    RenderNode,
    AssetMetricNode
} from "./assetPipelineNodes.js";

export function createDefaultAssetGraph() {
    return [
        InputAssetNode(),
        ResolveAssetUrlNode(),
        AssetMetricNode(),
        DecodeNode(),
        RenderNode(),
    ];
}