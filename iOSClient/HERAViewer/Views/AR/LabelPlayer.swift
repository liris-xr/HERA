import SceneKit

final class LabelPlayer {
    private let timedLabels: [(ArLabel, SCNNode)]
    private var timer: Timer?
    private var startDate: Date?
    private var pausedElapsed: Int = 0
    private(set) var isPaused = false

    init(labels: [ArLabel], parentNode: SCNNode) {
        var timed: [(ArLabel, SCNNode)] = []

        for label in labels {
            let node = LabelRenderer.makeNode(text: label.text)
            let p = label.position
            node.position = SCNVector3(p.x, p.y, p.z)

            if label.timestampStart != nil {
                node.isHidden = true
                timed.append((label, node))
            }
            parentNode.addChildNode(node)
        }
        timedLabels = timed
    }

    func start() {
        pausedElapsed = 0
        isPaused = false
        startDate = Date()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    func togglePause() {
        guard timer != nil || isPaused else { return }
        if isPaused {
            isPaused = false
            startDate = Date().addingTimeInterval(-Double(pausedElapsed) / 1000.0)
            timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                self?.tick()
            }
        } else {
            guard let start = startDate else { return }
            pausedElapsed = Int(Date().timeIntervalSince(start) * 1000)
            timer?.invalidate()
            timer = nil
            isPaused = true
        }
    }

    private func tick() {
        guard let start = startDate else { return }
        let elapsed = Int(Date().timeIntervalSince(start) * 1000)

        for (label, node) in timedLabels {
            guard let ts = label.timestampStart else { continue }
            let afterStart = elapsed >= ts
            let beforeEnd  = label.timestampEnd.map { elapsed <= $0 } ?? true
            node.isHidden = !(afterStart && beforeEnd)
        }
    }
}
