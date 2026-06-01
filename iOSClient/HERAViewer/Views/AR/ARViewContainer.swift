import SwiftUI
import ARKit
import SceneKit

// UIViewRepresentable wrapper for ARSCNView.
// The coordinator IS the ARSceneController so SwiftUI retains it safely.
struct ARViewContainer: UIViewRepresentable {
    @Binding var controller: ARSceneController?
    @Binding var isPlaced: Bool

    func makeCoordinator() -> ARSceneController {
        ARSceneController()
    }

    func makeUIView(context: Context) -> ARSCNView {
        let view = ARSCNView(frame: .zero)
        context.coordinator.configure(view) {
            DispatchQueue.main.async { isPlaced = true }
        }
        DispatchQueue.main.async { controller = context.coordinator }
        return view
    }

    func updateUIView(_ uiView: ARSCNView, context: Context) {
        context.coordinator.updateScreenCenter()
    }
}
