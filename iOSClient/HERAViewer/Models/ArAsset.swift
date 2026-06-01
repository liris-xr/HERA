import Foundation

struct ArAsset: Codable, Identifiable {
    let id: String
    let sceneId: String?
    let name: String
    let url: String
    let position: Vec3
    let rotation: Vec3
    let scale: Vec3
    let activeAnimation: String?
    let hideInViewer: Bool
}
