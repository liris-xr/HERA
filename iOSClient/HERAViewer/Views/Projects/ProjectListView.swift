import SwiftUI

struct ProjectListView: View {
    @EnvironmentObject var auth: AuthService

    @State private var projects: [ArProject] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSettings = false
    @State private var selectedProject: ArProject?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = errorMessage {
                    VStack(spacing: 12) {
                        Text(err).foregroundStyle(.secondary).multilineTextAlignment(.center)
                        Button("Retry") { Task { await load() } }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if projects.isEmpty {
                    ContentUnavailableView("No projects", systemImage: "cube.transparent",
                                          description: Text("No published projects were found on the server."))
                } else {
                    List(projects) { project in
                        ProjectRowView(project: project)
                            .contentShape(Rectangle())
                            .onTapGesture { selectedProject = project }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gear")
                    }
                }
                if !auth.isGuest {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Sign Out", role: .destructive) { auth.logout() }
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .navigationDestination(item: $selectedProject) { project in
                ARSessionView(projectSummary: project)
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            // The endpoint returns a plain JSON array (not wrapped).
            projects = try await APIClient.shared.get("/projects/0")
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
