import Foundation

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct AuthResponse: Decodable {
    let access_token: String
}

struct JWTPayload: Decodable {
    let id: String
    let username: String
    let email: String
    let admin: Bool
}
