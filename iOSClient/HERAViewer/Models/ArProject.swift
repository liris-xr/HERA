import Foundation

// Returned by GET /api/projects/:page (array) and GET /api/project/:id (single object).
// The list endpoint returns a flat array with id/title/pictureUrl/updatedAt/sceneCount/owner.
// The detail endpoint returns the full graph with nested scenes.
struct ArProject: Codable, Identifiable, Hashable {
    static func == (lhs: ArProject, rhs: ArProject) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    let id: String
    let title: String
    let description: String?
    let pictureUrl: String?
    let unit: String?
    let calibrationMessage: String?
    let displayMode: String?
    let published: Bool?
    let sceneCount: Int?
    let owner: ArProjectOwner?
    let scenes: [ArScene]?
    let updatedAt: String?
}

struct ArProjectOwner: Codable {
    let username: String
}
