import * as THREE from "three";
import {
    PointColorType,
    PointShape,
    PointSizeType,
    Potree,
} from "@pnext/three-loader";
import { createPotreeStreamingLoader } from "@shared/pointcloud/potreeStreamingCore.js";
import { getResource } from "@/js/endpoints.js";

export const {PotreeStreamingPointCloud, loadPotreeStreamingPointCloud,} = createPotreeStreamingLoader({
    THREE,
    Potree,
    PointColorType,
    PointShape,
    PointSizeType,
    resolveResourceUrl: getResource,
});
