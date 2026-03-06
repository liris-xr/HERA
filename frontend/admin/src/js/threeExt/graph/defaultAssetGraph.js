import { InputAssetNode, ResolveAssetUrlNode, DecodeNode, RenderNode } from "./assetPipelineNodes.js";

export function createDefaultAssetGraph() {
    return [
        InputAssetNode(),
        ResolveAssetUrlNode(),
        DecodeNode(),
        RenderNode(),
    ];
}