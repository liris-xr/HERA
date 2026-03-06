//exécute chaque node séquentiellment en accumulant data

export async function runLinearGraph(ctx, nodes) {
    let data = {};
    for (const node of nodes) {
        const out = await node.run(ctx, data);
        data = { ...data, ...out };
    }
    return data;
}
