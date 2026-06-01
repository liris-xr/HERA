import Foundation

struct ArScene: Codable, Identifiable {
    let id: String
    let projectId: String?
    let title: String
    let description: String?
    let index: Int?
    let envmapUrl: String?
    let vrStartPosition: VRStartPosition?
    let assets: [ArAsset]?
    let meshes: [ArMesh]?
    let labels: [ArLabel]?
}

struct VRStartPosition: Codable {
    let position: Vec3
    let rotation: Vec3
}
