import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: AppSettings
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) private var dismiss

    var isInitialSetup: Bool = false

    @State private var serverInput = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("https://192.168.1.10:8080", text: $serverInput)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Server address")
                } footer: {
                    Text("Enter the full HTTPS URL of the HERA API server, without a trailing slash.")
                }

                if !isInitialSetup {
                    Section {
                        Button("Sign Out", role: .destructive) {
                            auth.logout()
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle(isInitialSetup ? "Welcome to HERA" : "Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(serverInput.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                if !isInitialSetup {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                }
            }
            .onAppear { serverInput = settings.serverURL }
        }
    }

    private func save() {
        var url = serverInput.trimmingCharacters(in: .whitespacesAndNewlines)
        if url.hasSuffix("/") { url = String(url.dropLast()) }
        settings.serverURL = url
        if !isInitialSetup { dismiss() }
    }
}
