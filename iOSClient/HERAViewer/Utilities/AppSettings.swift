import Foundation

final class AppSettings: ObservableObject {
    static let shared = AppSettings()

    @Published var serverURL: String {
        didSet { UserDefaults.standard.set(serverURL, forKey: "serverURL") }
    }

    private init() {
        self.serverURL = UserDefaults.standard.string(forKey: "serverURL") ?? ""
    }

    var apiBaseURL: String { "\(serverURL)/api" }
    var resourcesBaseURL: String {
        serverURL.hasSuffix("/") ? serverURL : "\(serverURL)/"
    }
}
