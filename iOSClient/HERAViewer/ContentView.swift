import SwiftUI

struct ContentView: View {
    @EnvironmentObject var settings: AppSettings
    @EnvironmentObject var auth: AuthService

    var body: some View {
        if settings.serverURL.isEmpty {
            SettingsView(isInitialSetup: true)
        } else if !auth.isAuthenticated {
            LoginView()
        } else {
            ProjectListView()
        }
    }
}
