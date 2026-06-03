import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { once } from "node:events";

const MAX_PLY_HEADER_BYTES = 1024 * 1024;
const LAS_HEADER_BYTES = 227;
const LAS_POINT_RECORD_BYTES = 26;

const PLY_TYPES = {
    char: { size: 1, read: (buffer, offset) => buffer.readInt8(offset) },
    int8: { size: 1, read: (buffer, offset) => buffer.readInt8(offset) },
    uchar: { size: 1, read: (buffer, offset) => buffer.readUInt8(offset) },
    uint8: { size: 1, read: (buffer, offset) => buffer.readUInt8(offset) },
    short: { size: 2, read: (buffer, offset) => buffer.readInt16LE(offset) },
    int16: { size: 2, read: (buffer, offset) => buffer.readInt16LE(offset) },
    ushort: { size: 2, read: (buffer, offset) => buffer.readUInt16LE(offset) },
    uint16: { size: 2, read: (buffer, offset) => buffer.readUInt16LE(offset) },
    int: { size: 4, read: (buffer, offset) => buffer.readInt32LE(offset) },
    int32: { size: 4, read: (buffer, offset) => buffer.readInt32LE(offset) },
    uint: { size: 4, read: (buffer, offset) => buffer.readUInt32LE(offset) },
    uint32: { size: 4, read: (buffer, offset) => buffer.readUInt32LE(offset) },
    float: { size: 4, read: (buffer, offset) => buffer.readFloatLE(offset) },
    float32: { size: 4, read: (buffer, offset) => buffer.readFloatLE(offset) },
    double: { size: 8, read: (buffer, offset) => buffer.readDoubleLE(offset) },
    float64: { size: 8, read: (buffer, offset) => buffer.readDoubleLE(offset) },
};

function normalizeName(value = "") {
    return String(value ?? "").trim().toLowerCase();
}

function normalizeType(value = "") {
    return normalizeName(value);
}

function parseHeaderText(headerText) {
    const lines = headerText.split(/\r?\n/);
    if (lines[0]?.trim() !== "ply") {
        throw new Error("PLY to LAS conversion requires a valid PLY file.");
    }

    let format = null;
    let currentElement = null;
    const elements = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === "ply" || line === "end_header") continue;
        if (line.startsWith("comment ") || line.startsWith("obj_info ")) continue;

        const parts = line.split(/\s+/);
        const keyword = normalizeName(parts[0]);

        if (keyword === "format") {
            format = normalizeName(parts[1]);
            continue;
        }

        if (keyword === "element") {
            currentElement = {
                name: normalizeName(parts[1]),
                count: Number(parts[2]),
                properties: [],
            };
            elements.push(currentElement);
            continue;
        }

        if (keyword === "property" && currentElement) {
            if (normalizeName(parts[1]) === "list") {
                currentElement.properties.push({
                    isList: true,
                    countType: normalizeType(parts[2]),
                    itemType: normalizeType(parts[3]),
                    name: normalizeName(parts[4]),
                });
            } else {
                currentElement.properties.push({
                    isList: false,
                    type: normalizeType(parts[1]),
                    name: normalizeName(parts[2]),
                });
            }
        }
    }

    const vertexElement = elements.find((element) => element.name === "vertex");
    if (!vertexElement || !Number.isFinite(vertexElement.count) || vertexElement.count <= 0) {
        throw new Error("PLY point cloud must contain a non-empty vertex element.");
    }

    for (const property of vertexElement.properties) {
        if (property.isList) {
            throw new Error("PLY vertex list properties are not supported for point cloud conversion.");
        }
        if (!PLY_TYPES[property.type]) {
            throw new Error(`Unsupported PLY vertex property type: ${property.type}`);
        }
    }

    return {
        format,
        vertexCount: vertexElement.count,
        vertexProperties: vertexElement.properties,
    };
}

async function readPlyLayout(inputPath) {
    const handle = await fs.promises.open(inputPath, "r");

    try {
        const buffer = Buffer.alloc(MAX_PLY_HEADER_BYTES);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const headerBuffer = buffer.subarray(0, bytesRead);
        const marker = Buffer.from("end_header", "ascii");
        const markerIndex = headerBuffer.indexOf(marker);

        if (markerIndex === -1) {
            throw new Error("PLY header is missing end_header.");
        }

        let dataOffset = markerIndex + marker.length;
        if (headerBuffer[dataOffset] === 13 && headerBuffer[dataOffset + 1] === 10) {
            dataOffset += 2;
        } else if (headerBuffer[dataOffset] === 10 || headerBuffer[dataOffset] === 13) {
            dataOffset += 1;
        }

        const parsed = parseHeaderText(headerBuffer.subarray(0, dataOffset).toString("utf8"));
        return {
            ...parsed,
            dataOffset,
            inputPath,
        };
    } finally {
        await handle.close();
    }
}

function propertyIndex(properties, aliases) {
    return properties.findIndex((property) => aliases.includes(property.name));
}

function createVertexAccessors(properties) {
    const x = propertyIndex(properties, ["x"]);
    const y = propertyIndex(properties, ["y"]);
    const z = propertyIndex(properties, ["z"]);

    if (x === -1 || y === -1 || z === -1) {
        throw new Error("Classic point cloud .ply must contain vertex x, y, and z properties.");
    }

    return {
        x,
        y,
        z,
        red: propertyIndex(properties, ["red", "r", "diffuse_red"]),
        green: propertyIndex(properties, ["green", "g", "diffuse_green"]),
        blue: propertyIndex(properties, ["blue", "b", "diffuse_blue"]),
    };
}

function normalizeColor(value, property) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 65535;

    const type = property?.type;
    if (type === "uchar" || type === "uint8") {
        return Math.max(0, Math.min(65535, Math.round(n * 257)));
    }
    if (type === "ushort" || type === "uint16") {
        return Math.max(0, Math.min(65535, Math.round(n)));
    }
    if ((type === "float" || type === "float32" || type === "double" || type === "float64") && n >= 0 && n <= 1) {
        return Math.max(0, Math.min(65535, Math.round(n * 65535)));
    }
    if (n >= 0 && n <= 255) {
        return Math.max(0, Math.min(65535, Math.round(n * 257)));
    }
    return Math.max(0, Math.min(65535, Math.round(n)));
}

function pointFromValues(values, layout, accessors) {
    const props = layout.vertexProperties;

    return {
        x: Number(values[accessors.x]),
        y: Number(values[accessors.y]),
        z: Number(values[accessors.z]),
        red: accessors.red === -1 ? 65535 : normalizeColor(values[accessors.red], props[accessors.red]),
        green: accessors.green === -1 ? 65535 : normalizeColor(values[accessors.green], props[accessors.green]),
        blue: accessors.blue === -1 ? 65535 : normalizeColor(values[accessors.blue], props[accessors.blue]),
    };
}

async function* iterateAsciiVertices(layout) {
    const input = fs.createReadStream(layout.inputPath, {
        start: layout.dataOffset,
        encoding: "utf8",
    });
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    const accessors = createVertexAccessors(layout.vertexProperties);
    let count = 0;

    try {
        for await (const line of lines) {
            if (count >= layout.vertexCount) break;
            const trimmed = line.trim();
            if (!trimmed) continue;

            const values = trimmed.split(/\s+/);
            const point = pointFromValues(values, layout, accessors);
            if ([point.x, point.y, point.z].every(Number.isFinite)) {
                count++;
                yield point;
            }
        }
    } finally {
        lines.close();
        input.destroy();
    }
}

function getBinaryRecordSize(properties) {
    return properties.reduce((sum, property) => sum + PLY_TYPES[property.type].size, 0);
}

function readBinaryValues(buffer, recordOffset, properties) {
    const values = [];
    let offset = recordOffset;

    for (const property of properties) {
        const type = PLY_TYPES[property.type];
        values.push(type.read(buffer, offset));
        offset += type.size;
    }

    return values;
}

async function* iterateBinaryLittleEndianVertices(layout) {
    const accessors = createVertexAccessors(layout.vertexProperties);
    const recordSize = getBinaryRecordSize(layout.vertexProperties);
    const input = fs.createReadStream(layout.inputPath, { start: layout.dataOffset });
    let remainder = Buffer.alloc(0);
    let count = 0;

    try {
        for await (const chunk of input) {
            const buffer = remainder.length ? Buffer.concat([remainder, chunk]) : chunk;
            let offset = 0;

            while (count < layout.vertexCount && offset + recordSize <= buffer.length) {
                const point = pointFromValues(
                    readBinaryValues(buffer, offset, layout.vertexProperties),
                    layout,
                    accessors
                );

                if ([point.x, point.y, point.z].every(Number.isFinite)) {
                    count++;
                    yield point;
                }

                offset += recordSize;
            }

            remainder = buffer.subarray(offset);
            if (count >= layout.vertexCount) break;
        }
    } finally {
        input.destroy();
    }
}

function iterateVertices(layout) {
    if (layout.format === "ascii") return iterateAsciiVertices(layout);
    if (layout.format === "binary_little_endian") return iterateBinaryLittleEndianVertices(layout);

    throw new Error(`Unsupported PLY format for conversion: ${layout.format || "unknown"}`);
}

async function scanBounds(layout) {
    const bounds = {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity },
    };
    let pointCount = 0;

    for await (const point of iterateVertices(layout)) {
        pointCount++;
        bounds.min.x = Math.min(bounds.min.x, point.x);
        bounds.min.y = Math.min(bounds.min.y, point.y);
        bounds.min.z = Math.min(bounds.min.z, point.z);
        bounds.max.x = Math.max(bounds.max.x, point.x);
        bounds.max.y = Math.max(bounds.max.y, point.y);
        bounds.max.z = Math.max(bounds.max.z, point.z);
    }

    if (pointCount === 0) {
        throw new Error("PLY conversion found no valid XYZ points.");
    }

    return { bounds, pointCount };
}

function chooseScale(min, max) {
    const range = Math.abs(max - min);
    return Math.max(0.001, range / 2_000_000_000);
}

function dayOfYear(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.floor((now - start) / 86400000);
}

function writeFixedAscii(buffer, offset, length, value) {
    Buffer.from(String(value).slice(0, length), "ascii").copy(buffer, offset);
}

function createLasHeader({ bounds, pointCount, scale, offset }) {
    if (pointCount > 0xffffffff) {
        throw new Error("LAS 1.2 conversion supports up to 4,294,967,295 points.");
    }

    const now = new Date();
    const header = Buffer.alloc(LAS_HEADER_BYTES);

    header.write("LASF", 0, "ascii");
    header.writeUInt16LE(0, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt8(1, 24);
    header.writeUInt8(2, 25);
    writeFixedAscii(header, 26, 32, "HERA");
    writeFixedAscii(header, 58, 32, "HERA PLY to LAS");
    header.writeUInt16LE(dayOfYear(now), 90);
    header.writeUInt16LE(now.getUTCFullYear(), 92);
    header.writeUInt16LE(LAS_HEADER_BYTES, 94);
    header.writeUInt32LE(LAS_HEADER_BYTES, 96);
    header.writeUInt32LE(0, 100);
    header.writeUInt8(2, 104);
    header.writeUInt16LE(LAS_POINT_RECORD_BYTES, 105);
    header.writeUInt32LE(pointCount, 107);
    header.writeUInt32LE(pointCount, 111);

    header.writeDoubleLE(scale.x, 131);
    header.writeDoubleLE(scale.y, 139);
    header.writeDoubleLE(scale.z, 147);
    header.writeDoubleLE(offset.x, 155);
    header.writeDoubleLE(offset.y, 163);
    header.writeDoubleLE(offset.z, 171);
    header.writeDoubleLE(bounds.max.x, 179);
    header.writeDoubleLE(bounds.min.x, 187);
    header.writeDoubleLE(bounds.max.y, 195);
    header.writeDoubleLE(bounds.min.y, 203);
    header.writeDoubleLE(bounds.max.z, 211);
    header.writeDoubleLE(bounds.min.z, 219);

    return header;
}

function clampInt32(value) {
    return Math.max(-2147483648, Math.min(2147483647, value));
}

function createLasPointRecord(point, scale, offset) {
    const record = Buffer.alloc(LAS_POINT_RECORD_BYTES);

    record.writeInt32LE(clampInt32(Math.round((point.x - offset.x) / scale.x)), 0);
    record.writeInt32LE(clampInt32(Math.round((point.y - offset.y) / scale.y)), 4);
    record.writeInt32LE(clampInt32(Math.round((point.z - offset.z) / scale.z)), 8);
    record.writeUInt16LE(0, 12);
    record.writeUInt8(1 | (1 << 3), 14);
    record.writeUInt8(0, 15);
    record.writeInt8(0, 16);
    record.writeUInt8(0, 17);
    record.writeUInt16LE(0, 18);
    record.writeUInt16LE(point.red, 20);
    record.writeUInt16LE(point.green, 22);
    record.writeUInt16LE(point.blue, 24);

    return record;
}

async function writeLasFile(layout, outputPath, scan) {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const scale = {
        x: chooseScale(scan.bounds.min.x, scan.bounds.max.x),
        y: chooseScale(scan.bounds.min.y, scan.bounds.max.y),
        z: chooseScale(scan.bounds.min.z, scan.bounds.max.z),
    };
    const offset = {
        x: scan.bounds.min.x,
        y: scan.bounds.min.y,
        z: scan.bounds.min.z,
    };
    const headerBounds = {
        min: {
            x: scan.bounds.min.x - scale.x,
            y: scan.bounds.min.y - scale.y,
            z: scan.bounds.min.z - scale.z,
        },
        max: {
            x: scan.bounds.max.x + scale.x,
            y: scan.bounds.max.y + scale.y,
            z: scan.bounds.max.z + scale.z,
        },
    };

    const stream = fs.createWriteStream(outputPath);
    stream.write(createLasHeader({
        bounds: headerBounds,
        pointCount: scan.pointCount,
        scale,
        offset,
    }));

    for await (const point of iterateVertices(layout)) {
        if (!stream.write(createLasPointRecord(point, scale, offset))) {
            await once(stream, "drain");
        }
    }

    stream.end();
    await once(stream, "finish");

    return {
        pointCount: scan.pointCount,
        bounds: scan.bounds,
        scale,
        offset,
    };
}

export async function convertPlyToLas({ inputPath, outputPath }) {
    const layout = await readPlyLayout(inputPath);
    const scan = await scanBounds(layout);
    const las = await writeLasFile(layout, outputPath, scan);

    return {
        ...las,
        plyFormat: layout.format,
        sourcePointCount: layout.vertexCount,
    };
}
