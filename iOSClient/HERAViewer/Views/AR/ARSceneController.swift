import ARKit
import SceneKit
import GLTFKit2

// ARSceneController is the UIViewRepresentable coordinator: SwiftUI retains it
// through the coordinator lifecycle, so it is also the ARSCNViewDelegate.
final class ARSceneController: NSObject {
    private(set) weak var arView: ARSCNView?
    private var rootNode: SCNNode?
    private var isPlaced = false
    private var labelPlayer: LabelPlayer?
    private var onPlaced: (() -> Void)?
    var onPauseChanged: ((Bool) -> Void)?
    private var reticleNode: SCNNode?
    private var directionalLightNode: SCNNode?
    private var ambientLightNode: SCNNode?
    private var screenCenter: CGPoint = .zero

    // Called once from ARViewContainer.makeUIView
    func configure(_ view: ARSCNView, onPlaced: @escaping () -> Void) {
        self.arView = view
        self.onPlaced = onPlaced
        view.delegate = self
        view.autoenablesDefaultLighting = false
        view.automaticallyUpdatesLighting = false

        setupLighting(in: view)

        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal]
        config.environmentTexturing = .automatic
        config.isLightEstimationEnabled = true
        view.session.run(config, options: [.resetTracking, .removeExistingAnchors])

        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        view.addGestureRecognizer(tap)

        reticleNode = makeReticle()
        reticleNode?.isHidden = true
        view.scene.rootNode.addChildNode(reticleNode!)

        screenCenter = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
    }

    func updateScreenCenter() {
        guard let view = arView else { return }
        screenCenter = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
    }

    // MARK: - Lighting

    private func setupLighting(in view: ARSCNView) {
        let directional = SCNLight()
        directional.type = .directional
        directional.intensity = 1000
        directional.color = UIColor.white
        directional.castsShadow = true
        directional.shadowMode = .deferred
        directional.shadowSampleCount = 8
        directional.shadowRadius = 4
        directional.shadowColor = UIColor.black.withAlphaComponent(0.5)
        directional.automaticallyAdjustsShadowProjection = true

        let dirNode = SCNNode()
        dirNode.light = directional
        dirNode.eulerAngles = SCNVector3(-Float.pi / 3, Float.pi / 4, 0)
        view.scene.rootNode.addChildNode(dirNode)
        directionalLightNode = dirNode

        let ambient = SCNLight()
        ambient.type = .ambient
        ambient.intensity = 400
        ambient.color = UIColor.white

        let ambNode = SCNNode()
        ambNode.light = ambient
        view.scene.rootNode.addChildNode(ambNode)
        ambientLightNode = ambNode
    }

    private func updateLighting(from frame: ARFrame) {
        guard let estimate = frame.lightEstimate else { return }
        let intensity = estimate.ambientIntensity
        let temperature = estimate.ambientColorTemperature

        directionalLightNode?.light?.intensity = intensity * 0.8
        directionalLightNode?.light?.temperature = temperature

        ambientLightNode?.light?.intensity = intensity * 0.3
        ambientLightNode?.light?.temperature = temperature
    }

    // MARK: - Reticle

    private func makeReticle() -> SCNNode {
        let radius: CGFloat = 0.06
        let ringThickness: CGFloat = 0.003

        // Outer ring
        let ring = SCNTorus(ringRadius: radius, pipeRadius: ringThickness)
        let material = SCNMaterial()
        material.diffuse.contents = UIColor.white
        material.emission.contents = UIColor.white
        ring.materials = [material]
        let ringNode = SCNNode(geometry: ring)

        // Crosshair lines
        let lineMaterial = SCNMaterial()
        lineMaterial.diffuse.contents = UIColor.white.withAlphaComponent(0.6)
        lineMaterial.emission.contents = UIColor.white.withAlphaComponent(0.6)

        let lineLength: CGFloat = radius * 0.5
        let lineThickness: CGFloat = 0.001
        let lineGeo = SCNBox(width: lineLength, height: lineThickness, length: lineThickness, chamferRadius: 0)
        lineGeo.materials = [lineMaterial]

        let hLine = SCNNode(geometry: lineGeo)
        let vLine = SCNNode(geometry: lineGeo)
        vLine.eulerAngles.y = .pi / 2

        // Center dot
        let dot = SCNSphere(radius: 0.003)
        dot.materials = [material]
        let dotNode = SCNNode(geometry: dot)

        let container = SCNNode()
        container.addChildNode(ringNode)
        container.addChildNode(hLine)
        container.addChildNode(vLine)
        container.addChildNode(dotNode)
        return container
    }

    func loadScene(_ scene: ArScene, baseURL: String, keepPlacement: Bool = false) {
        labelPlayer?.stop()
        labelPlayer = nil

        // Remove scene content but optionally keep the root anchor
        if keepPlacement, let root = rootNode {
            root.childNodes.forEach { $0.removeFromParentNode() }
        } else {
            rootNode?.removeFromParentNode()
            rootNode = nil
            isPlaced = false
            reticleNode?.isHidden = false
        }

        Task { await predownload(scene, baseURL: baseURL) }
    }

    func resetPlacement() {
        labelPlayer?.stop()
        labelPlayer = nil
        rootNode?.removeFromParentNode()
        rootNode = nil
        isPlaced = false
        reticleNode?.isHidden = false
    }

    func stop() {
        labelPlayer?.stop()
        arView?.session.pause()
    }

    // MARK: - Tap to place

    @objc func handleTap(_ gesture: UITapGestureRecognizer) {
        if !isPlaced, let reticle = reticleNode, !reticle.isHidden {
            isPlaced = true
            reticle.isHidden = true
            placeRoot(at: reticle.simdWorldTransform)
            onPlaced?()
        } else if isPlaced {
            labelPlayer?.togglePause()
            onPauseChanged?(labelPlayer?.isPaused ?? false)
        }
    }

    private func placeRoot(at transform: simd_float4x4) {
        guard let view = arView else { return }
        let anchor = ARAnchor(transform: transform)
        view.session.add(anchor: anchor)

        let node = SCNNode()
        node.simdWorldTransform = transform
        view.scene.rootNode.addChildNode(node)
        rootNode = node
    }

    // MARK: - Asset loading

    private func predownload(_ scene: ArScene, baseURL: String) async {
        let assets = scene.assets ?? []
        if !assets.isEmpty {
            await withTaskGroup(of: Void.self) { group in
                for asset in assets {
                    let url = "\(baseURL)\(asset.url)"
                    group.addTask { _ = try? await AssetCache.shared.download(from: url) }
                }
            }
        }
        await buildScene(scene, baseURL: baseURL)
    }

    @MainActor
    private func buildScene(_ scene: ArScene, baseURL: String) async {
        // Wait until the user has placed the scene anchor.
        while !isPlaced {
            try? await Task.sleep(nanoseconds: 100_000_000)
        }
        guard let root = rootNode else { return }

        let meshOverrider = MeshOverrider(meshes: scene.meshes ?? [])

        for asset in scene.assets ?? [] {
            let remoteURL = "\(baseURL)\(asset.url)"
            guard let localURL = try? await AssetCache.shared.download(from: remoteURL) else { continue }
            guard let gltfAsset = try? GLTFAsset(url: localURL) else { continue }

            let source = GLTFSCNSceneSource(asset: gltfAsset)
            guard let scnScene = source.defaultScene else { continue }

            let assetNode = SCNNode()
            for child in scnScene.rootNode.childNodes {
                assetNode.addChildNode(child)
            }

            let p = asset.position
            assetNode.position = SCNVector3(p.x, p.y, p.z)
            let r = asset.rotation
            assetNode.eulerAngles = SCNVector3(r.x, r.y, r.z)
            let s = asset.scale
            assetNode.scale = SCNVector3(s.x, s.y, s.z)

            meshOverrider.apply(to: assetNode)

            if let clipName = asset.activeAnimation {
                if let anim = source.animations.first(where: { $0.name == clipName }) {
                    let player = anim.animationPlayer
                    assetNode.addAnimationPlayer(player, forKey: clipName)
                    player.play()
                }
            }

            root.addChildNode(assetNode)
        }

        let labels = scene.labels ?? []
        if !labels.isEmpty {
            labelPlayer = LabelPlayer(labels: labels, parentNode: root)
            labelPlayer?.start()
        }
    }
}

// MARK: - ARSCNViewDelegate

extension ARSceneController: ARSCNViewDelegate {
    func renderer(_ renderer: SCNSceneRenderer, didAdd node: SCNNode, for anchor: ARAnchor) {}

    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        guard let view = arView else { return }

        if let frame = view.session.currentFrame {
            updateLighting(from: frame)
        }

        guard !isPlaced, let reticle = reticleNode else { return }
        let center = screenCenter
        guard center != .zero,
              let query = view.raycastQuery(from: center,
                                            allowing: .estimatedPlane,
                                            alignment: .horizontal),
              let result = view.session.raycast(query).first else {
            DispatchQueue.main.async { reticle.isHidden = true }
            return
        }
        DispatchQueue.main.async {
            reticle.simdWorldTransform = result.worldTransform
            reticle.isHidden = false
        }
    }
}
