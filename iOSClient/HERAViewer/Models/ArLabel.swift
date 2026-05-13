import Foundation

struct ArLabel: Codable, Identifiable {
    let id: String
    let sceneId: String?
    let text: String
    let position: Vec3
    let timestampStart: Int?
    let timestampEnd: Int?
}
