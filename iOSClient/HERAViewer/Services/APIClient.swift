import Foundation

enum APIError: LocalizedError {
    case noServerConfigured
    case invalidURL
    case unauthorized
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .noServerConfigured:   return "No server configured. Please check Settings."
        case .invalidURL:           return "Invalid server URL."
        case .unauthorized:         return "Invalid credentials."
        case .serverError(let c):   return "Server error (\(c))."
        case .decodingError(let e): return "Data error: \(e.localizedDescription)"
        case .networkError(let e):  return e.localizedDescription
        }
    }
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    private func request(_ path: String, method: String = "GET", body: Data? = nil) throws -> URLRequest {
        let base = AppSettings.shared.apiBaseURL
        guard !base.isEmpty else { throw APIError.noServerConfigured }
        guard let url = URL(string: "\(base)\(path)") else { throw APIError.invalidURL }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainHelper.load(key: "jwt_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = body
        return req
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        let req = try request(path)
        return try await perform(req)
    }

    func post<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        let data = try JSONEncoder().encode(body)
        let req = try request(path, method: "POST", body: data)
        return try await perform(req)
    }

    private func perform<T: Decodable>(_ req: URLRequest) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await NetworkSession.shared.data(for: req)
        } catch {
            throw APIError.networkError(error)
        }
        if let http = response as? HTTPURLResponse {
            switch http.statusCode {
            case 200...299: break
            case 401: throw APIError.unauthorized
            default: throw APIError.serverError(http.statusCode)
            }
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
