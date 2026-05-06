import SwiftUI

@main
struct HERAViewerApp: App {
    @StateObject private var settings = AppSettings.shared
    @StateObject private var auth = AuthService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)
                .environmentObject(auth)
        }
    }
}
