import SceneKit
import UIKit

enum LabelRenderer {

    private static let panelWidth: CGFloat = 320
    private static let padding: CGFloat = 12

    static func makeNode(text: String) -> SCNNode {
        let image = renderHTML(text)

        let aspect = image.size.height / image.size.width
        let planeWidth: CGFloat = 0.30
        let planeHeight = planeWidth * aspect

        let plane = SCNPlane(width: planeWidth, height: planeHeight)
        let material = SCNMaterial()
        material.diffuse.contents = image
        material.isDoubleSided = true
        material.lightingModel = .constant
        plane.materials = [material]

        let planeNode = SCNNode(geometry: plane)

        let connectorHeight: CGFloat = 0.04
        let connector = SCNBox(width: 0.003, height: connectorHeight, length: 0.003, chamferRadius: 0)
        let connMat = SCNMaterial()
        connMat.diffuse.contents = UIColor.white
        connMat.lightingModel = .constant
        connector.materials = [connMat]
        let connectorNode = SCNNode(geometry: connector)

        let dot = SCNSphere(radius: 0.005)
        let dotMat = SCNMaterial()
        dotMat.diffuse.contents = UIColor.white
        dotMat.lightingModel = .constant
        dot.materials = [dotMat]
        let dotNode = SCNNode(geometry: dot)

        let container = SCNNode()
        planeNode.position = SCNVector3(0, Float(planeHeight) / 2 + Float(connectorHeight), 0)
        connectorNode.position = SCNVector3(0, Float(connectorHeight) / 2, 0)
        dotNode.position = SCNVector3(0, 0, 0)

        container.addChildNode(planeNode)
        container.addChildNode(connectorNode)
        container.addChildNode(dotNode)

        let billboard = SCNBillboardConstraint()
        billboard.freeAxes = .Y
        container.constraints = [billboard]

        return container
    }

    private static func renderHTML(_ html: String) -> UIImage {
        let styledHTML = """
        <!DOCTYPE html>
        <html>
        <head>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, Helvetica Neue, sans-serif;
                font-size: 14px;
                color: white;
                line-height: 1.4;
            }
            h1, h2, h3 { margin-bottom: 6px; color: white; }
            p { margin-bottom: 8px; }
        </style>
        </head>
        <body>\(html)</body>
        </html>
        """

        guard let data = styledHTML.data(using: .utf8),
              let attrString = try? NSAttributedString(
                  data: data,
                  options: [
                      .documentType: NSAttributedString.DocumentType.html,
                      .characterEncoding: String.Encoding.utf8.rawValue
                  ],
                  documentAttributes: nil)
        else {
            return fallbackImage(for: html)
        }

        let textWidth = panelWidth - padding * 2
        let boundingRect = attrString.boundingRect(
            with: CGSize(width: textWidth, height: 2000),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil)
        let contentHeight = ceil(boundingRect.height)
        let totalHeight = contentHeight + padding * 2

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: panelWidth, height: totalHeight))
        return renderer.image { _ in
            UIColor.black.withAlphaComponent(0.75).setFill()
            UIBezierPath(roundedRect: CGRect(x: 0, y: 0, width: panelWidth, height: totalHeight),
                         cornerRadius: 8).fill()

            attrString.draw(with: CGRect(x: padding, y: padding, width: textWidth, height: contentHeight),
                            options: [.usesLineFragmentOrigin, .usesFontLeading],
                            context: nil)
        }
    }

    private static func fallbackImage(for text: String) -> UIImage {
        let stripped = text.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14),
            .foregroundColor: UIColor.white
        ]
        let size = CGSize(width: panelWidth, height: 60)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            UIColor.black.withAlphaComponent(0.75).setFill()
            UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 8).fill()
            (stripped as NSString).draw(in: CGRect(x: 12, y: 12, width: size.width - 24, height: size.height - 24),
                                        withAttributes: attrs)
        }
    }
}
