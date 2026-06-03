import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { getResource } from "@/js/endpoints.js";
import { createStaticPointCloudLoader } from "@shared/pointcloud/staticPointCloudCore.js";

export const { loadStaticPointCloud } = createStaticPointCloudLoader({
    THREE,
    PLYLoader,
    resolveResourceUrl: getResource,
});
