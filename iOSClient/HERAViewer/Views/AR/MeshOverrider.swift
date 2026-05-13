import SceneKit

// Walks the SceneKit node tree and applies ArMesh PBR overrides by matching
// node names to the mesh names stored in the database.
struct MeshOverrider {
    private let meshByName: [String: ArMesh]

    init(meshes: [ArMesh]) {
        meshByName = Dictionary(uniqueKeysWithValues: meshes.map { ($0.name, $0) })
    }

    func apply(to rootNode: SCNNode) {
        rootNode.enumerateChildNodes { node, _ in
            guard let name = node.name, let mesh = meshByName[name] else { return }

            if mesh.hideInViewer {
                node.isHidden = true
                return
            }

            node.geometry?.materials.forEach { apply(mesh, to: $0) }

            // Per-mesh transform offsets (relative to asset origin)
            node.position = SCNVector3(mesh.position.x, mesh.position.y, mesh.position.z)
            node.eulerAngles = SCNVector3(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z)
            node.scale = SCNVector3(mesh.scale.x, mesh.scale.y, mesh.scale.z)
        }
    }

    private func apply(_ mesh: ArMesh, to material: SCNMaterial) {
        material.lightingModel = .physicallyBased

        material.diffuse.contents = UIColor(
            red: CGFloat(mesh.color.r),
            green: CGFloat(mesh.color.g),
            blue: CGFloat(mesh.color.b),
            alpha: CGFloat(mesh.opacity)
        )
        material.roughness.contents  = mesh.roughness
        material.metalness.contents  = mesh.metalness
        material.transparency        = CGFloat(mesh.opacity)

        let ei = mesh.emissiveIntensity
        material.emission.contents = UIColor(
            red: CGFloat(mesh.emissive.r * ei),
            green: CGFloat(mesh.emissive.g * ei),
            blue: CGFloat(mesh.emissive.b * ei),
            alpha: 1
        )
    }
}
