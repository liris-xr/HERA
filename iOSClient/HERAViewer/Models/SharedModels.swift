import Foundation

struct Vec3: Codable {
    let x: Float
    let y: Float
    let z: Float

    init(x: Float, y: Float, z: Float) {
        self.x = x
        self.y = y
        self.z = z
    }

    static let zero = Vec3(x: 0, y: 0, z: 0)
    static let one  = Vec3(x: 1, y: 1, z: 1)

    // The backend stores Three.js Euler rotations as {_x, _y, _z, _order, isEuler}
    // instead of the plain {x, y, z} used for position/scale.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: FlexibleKeys.self)
        if let x = try? container.decode(Float.self, forKey: .x) {
            self.x = x
            self.y = try container.decode(Float.self, forKey: .y)
            self.z = try container.decode(Float.self, forKey: .z)
        } else {
            self.x = try container.decode(Float.self, forKey: ._x)
            self.y = try container.decode(Float.self, forKey: ._y)
            self.z = try container.decode(Float.self, forKey: ._z)
        }
    }

    private enum FlexibleKeys: String, CodingKey {
        case x, y, z
        case _x, _y, _z
    }
}

struct RGB: Codable {
    let r: Float
    let g: Float
    let b: Float
}
