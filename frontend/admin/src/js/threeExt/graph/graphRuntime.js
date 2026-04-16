// graphRuntime.js
// Warning-first graph runtime for HERA.
// Goal:
// - keep current behavior as much as possible
// - replace flat merge with structured state
// - add requires/provides metadata
// - warn first instead of throwing everywhere

function createInitialPipelineState(ctx = {}) {
    return {
        input: {
            asset: ctx?.asset ?? null,
        },
        source: {
            manifest: null,
            url: null,
            variant: null,
            fromUpload: false,
        },
        metrics: {
            assetSizeBytes: null,
        },
        policy: {
            recommendedSimplifyRatio: null,
        },
        resource: {
            object3D: null,
        },
        runtime: {
            warnings: [],
            executedNodes: [],
        },
    };
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function deepClone(value) {
    // Do NOT deep clone runtime objects like Vue refs, class instances,
    // functions, Three.js objects, etc.
    // We only keep this helper for plain JSON-safe values if ever needed.
    if (value === null || value === undefined) return value;

    if (typeof value !== "object") return value;

    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item));
    }

    const out = {};
    for (const [key, val] of Object.entries(value)) {
        if (typeof val === "function") continue;

        if (val && typeof val === "object") {
            const proto = Object.getPrototypeOf(val);
            const isPlain =
                proto === Object.prototype || proto === null || Array.isArray(val);

            if (!isPlain) {
                // keep non-plain runtime objects by reference
                out[key] = val;
            } else {
                out[key] = deepClone(val);
            }
        } else {
            out[key] = val;
        }
    }

    return out;
}

function getByPath(obj, path) {
    if (!path) return obj;

    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
        if (current == null || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

function applyPatch(target, patch) {
    if (!isPlainObject(target) || !isPlainObject(patch)) return target;

    for (const [key, value] of Object.entries(patch)) {
        const targetValue = target[key];

        const shouldDeepMerge =
            isPlainObject(value) &&
            isPlainObject(targetValue);

        if (shouldDeepMerge) {
            applyPatch(targetValue, value);
        } else {
            // assign by reference for class instances, Vue refs,
            // Three.js objects, arrays, primitives, etc.
            target[key] = value;
        }
    }

    return target;
}

function pushWarning(state, message) {
    if (!state?.runtime?.warnings) return;
    state.runtime.warnings.push(message);
    console.warn(message);
}

function validateNodeShape(node, state) {
    if (!node || typeof node !== "object") {
        pushWarning(state, "[GraphRuntime] Invalid node: node must be an object.");
        return false;
    }

    if (!node.id || typeof node.id !== "string") {
        pushWarning(state, "[GraphRuntime] Invalid node: missing string 'id'.");
        return false;
    }

    if (typeof node.run !== "function") {
        pushWarning(state, `[GraphRuntime] Invalid node '${node.id}': missing run(ctx, state, services).`);
        return false;
    }

    if (node.requires != null && !Array.isArray(node.requires)) {
        pushWarning(state, `[GraphRuntime] Invalid node '${node.id}': 'requires' must be an array.`);
    }

    if (node.provides != null && !Array.isArray(node.provides)) {
        pushWarning(state, `[GraphRuntime] Invalid node '${node.id}': 'provides' must be an array.`);
    }

    return true;
}

function validateRequiredPaths(node, state) {
    const missing = [];
    const requires = Array.isArray(node.requires) ? node.requires : [];

    for (const path of requires) {
        const value = getByPath(state, path);
        if (value === undefined || value === null) {
            missing.push(path);
        }
    }

    if (missing.length > 0) {
        pushWarning(
            state,
            `[GraphRuntime] Node '${node.id}' missing required paths: ${missing.join(", ")}`
        );
    }
}

function validateProvidedPaths(node, patch, stateAfter) {
    const provides = Array.isArray(node.provides) ? node.provides : [];
    if (provides.length === 0) return;

    const missing = [];

    for (const path of provides) {
        const patchValue = getByPath(patch, path);
        const afterValue = getByPath(stateAfter, path);

        const patchSetIt = patchValue !== undefined;
        const finalExists = afterValue !== undefined;

        if (!patchSetIt && !finalExists) {
            missing.push(path);
        }
    }

    if (missing.length > 0) {
        pushWarning(
            stateAfter,
            `[GraphRuntime] Node '${node.id}' declared provides but did not clearly set: ${missing.join(", ")}`
        );
    }
}
function createDefaultServices(ctx = {}) {
    return {
        resourceLoader: {
            async load({ asset, url, fromUpload }) {
                if (!asset || typeof asset.load !== "function") {
                    throw new Error("[resourceLoader] asset.load() is unavailable.");
                }

                return asset.load({
                    urlOverride: url ?? null,
                    forceUpload: !!fromUpload,
                });
            },
        },
        logger: console,
        ...ctx?.services,
    };
}

export async function runLinearGraph(ctx, nodes, options = {}) {
    if (!Array.isArray(nodes)) {
        throw new Error("[GraphRuntime] nodes must be an array.");
    }

    const state = options.initialState
        ? options.initialState
        : createInitialPipelineState(ctx);

    const services = createDefaultServices(ctx);

    for (const node of nodes) {
        const isValid = validateNodeShape(node, state);
        if (!isValid) continue;

        validateRequiredPaths(node, state);

        const stateBefore = state;

        let patch = {};
        try {
            const result = await node.run(ctx, state, services);
            if (result != null) {
                if (!isPlainObject(result)) {
                    pushWarning(
                        state,
                        `[GraphRuntime] Node '${node.id}' returned a non-object patch. Ignored.`
                    );
                } else {
                    patch = result;
                }
            }
        } catch (error) {
            const wrapped = `[GraphRuntime] Node '${node.id}' failed: ${error?.message || error}`;
            pushWarning(state, wrapped);
            throw error;
        }

        applyPatch(state, patch);
        validateProvidedPaths(node, patch, state);

        state.runtime.executedNodes.push(node.id);
    }

    return state;
}

export {
    createInitialPipelineState,
    getByPath,
    applyPatch,
};