import Foundation

actor AssetCache {
    static let shared = AssetCache()

    private let cacheDir: URL

    private init() {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDir = caches.appendingPathComponent("HERAAssets", isDirectory: true)
        try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
    }

    func fullURL(for serverPath: String) -> String {
        "\(AppSettings.shared.resourcesBaseURL)\(serverPath)"
    }

    func localURL(for remoteURLString: String) -> URL {
        let name = remoteURLString
            .components(separatedBy: "/").last?
            .addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? UUID().uuidString
        return cacheDir.appendingPathComponent(name)
    }

    func download(from remoteURLString: String) async throws -> URL {
        let local = localURL(for: remoteURLString)
        if FileManager.default.fileExists(atPath: local.path) { return local }

        guard let url = URL(string: remoteURLString) else { throw URLError(.badURL) }
        let (tmp, _) = try await NetworkSession.shared.download(from: url)
        // Move from tmp location to cache; overwrite if a partial file exists.
        _ = try? FileManager.default.removeItem(at: local)
        try FileManager.default.moveItem(at: tmp, to: local)
        return local
    }
}
