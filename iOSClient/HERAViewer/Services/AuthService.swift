import Foundation

@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published private(set) var isAuthenticated = false
    @Published private(set) var currentUser: JWTPayload?

    var isGuest: Bool { isAuthenticated && currentUser == nil }

    private init() {
        if let token = KeychainHelper.load(key: "jwt_token") {
            currentUser = Self.decodeJWT(token)
            isAuthenticated = true
        }
    }

    func login(email: String, password: String) async throws {
        let response: AuthResponse = try await APIClient.shared.post(
            "/auth/login",
            body: LoginRequest(email: email, password: password)
        )
        KeychainHelper.save(response.access_token, key: "jwt_token")
        currentUser = Self.decodeJWT(response.access_token)
        isAuthenticated = true
    }

    func continueAsGuest() {
        currentUser = nil
        isAuthenticated = true
    }

    func logout() {
        KeychainHelper.delete(key: "jwt_token")
        isAuthenticated = false
        currentUser = nil
    }

    private static func decodeJWT(_ token: String) -> JWTPayload? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        var b64 = parts[1]
        let rem = b64.count % 4
        if rem > 0 { b64 += String(repeating: "=", count: 4 - rem) }
        guard let data = Data(base64Encoded: b64) else { return nil }
        return try? JSONDecoder().decode(JWTPayload.self, from: data)
    }
}
