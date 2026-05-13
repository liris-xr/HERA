import SwiftUI
import ARKit

struct ARSessionView: View {
    let projectSummary: ArProject

    @State private var project: ArProject?
    @State private var isLoadingProject = true
    @State private var sceneController: ARSceneController?
    @State private var currentSceneIndex = 0
    @State private var isPlaced = false
    @State private var isPaused = false
    @State private var showSettings = false

    private var scenes: [ArScene] { project?.scenes ?? [] }

    var body: some View {
        ZStack {
            if isLoadingProject {
                ProgressView("Loading project…")
            } else if let proj = project, !proj.scenes.isNilOrEmpty {
                ARViewContainer(controller: $sceneController, isPlaced: $isPlaced)
                    .ignoresSafeArea()
                    .onChange(of: sceneController) { ctrl in
                        if let ctrl, let first = scenes.first {
                            ctrl.onPauseChanged = { paused in isPaused = paused }
                            ctrl.loadScene(first, baseURL: AppSettings.shared.resourcesBaseURL)
                        }
                    }

                overlayUI
            } else {
                ContentUnavailableView("No scenes", systemImage: "cube.transparent",
                                       description: Text("This project has no scenes to display."))
            }
        }
        .navigationTitle(projectSummary.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showSettings = true } label: { Image(systemName: "gear") }
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .task { await loadFullProject() }
        .onDisappear { sceneController?.stop() }
    }

    @ViewBuilder
    private var overlayUI: some View {
        VStack {
            if !isPlaced {
                placementHint
            }
            Spacer()

            if isPaused {
                Label("Paused — tap to resume", systemImage: "pause.fill")
                    .font(.subheadline)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 8)
            }

            HStack(spacing: 12) {
                if isPlaced {
                    Button {
                        isPlaced = false
                        isPaused = false
                        sceneController?.resetPlacement()
                    } label: {
                        Image(systemName: "arrow.counterclockwise.circle.fill")
                            .font(.title)
                    }
                }
                if scenes.count > 1 {
                    sceneNavigator
                }
            }
            .padding(.bottom, 24)
        }
        .padding(.horizontal)
    }

    private var placementHint: some View {
        Text("Tap a horizontal surface to place the scene")
            .font(.footnote)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .padding(.top, 12)
    }

    private var sceneNavigator: some View {
        HStack(spacing: 16) {
            Button {
                guard currentSceneIndex > 0 else { return }
                currentSceneIndex -= 1
                sceneController?.loadScene(scenes[currentSceneIndex],
                                           baseURL: AppSettings.shared.resourcesBaseURL,
                                           keepPlacement: true)
            } label: {
                Image(systemName: "chevron.left.circle.fill").font(.title)
            }
            .disabled(currentSceneIndex == 0)

            if let unit = project?.unit {
                Text("\(unit) \(currentSceneIndex + 1) / \(scenes.count)")
                    .font(.subheadline.bold())
            } else {
                Text("\(currentSceneIndex + 1) / \(scenes.count)")
                    .font(.subheadline.bold())
            }

            Button {
                guard currentSceneIndex < scenes.count - 1 else { return }
                currentSceneIndex += 1
                sceneController?.loadScene(scenes[currentSceneIndex],
                                           baseURL: AppSettings.shared.resourcesBaseURL,
                                           keepPlacement: true)
            } label: {
                Image(systemName: "chevron.right.circle.fill").font(.title)
            }
            .disabled(currentSceneIndex == scenes.count - 1)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial, in: Capsule())
    }

    private func loadFullProject() async {
        isLoadingProject = true
        defer { isLoadingProject = false }
        do {
            project = try await APIClient.shared.get("/project/\(projectSummary.id)")
        } catch {
            print("[ARSessionView] Failed to load project \(projectSummary.id): \(error)")
        }
    }
}

private extension Optional where Wrapped: Collection {
    var isNilOrEmpty: Bool { self?.isEmpty ?? true }
}
