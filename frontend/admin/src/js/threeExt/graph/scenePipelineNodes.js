export function RenderNode() {
    return {
        id: "Render",
        requires: ["resource.object3D"],
        provides: [],

        async run(ctx, state) {
            if (!ctx?.scene) {
                throw new Error("[RenderNode] ctx.scene missing");
            }

            const object3D = state?.resource?.object3D ?? null;
            if (!object3D) {
                throw new Error("[RenderNode] resource.object3D missing");
            }

            ctx.scene.add(object3D);
            return {};
        },
    };
}
