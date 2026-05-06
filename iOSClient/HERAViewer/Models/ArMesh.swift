import Foundation

// ArMesh has a composite DB key (id + assetId); for Swift we use id as the
// Identifiable key since each mesh name is unique within a scene.
struct ArMesh: Codable, Identifiable {
    let id: String
    let assetId: String?
    let sceneId: String?
    let name: String
    let position: Vec3
    let rotation: Vec3
    let scale: Vec3
    let color: RGB
    let emissive: RGB
    let emissiveIntensity: Float
    let roughness: Float
    let metalness: Float
    let opacity: Float
    let hideInViewer: Bool
}
