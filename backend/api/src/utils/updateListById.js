export async function updateListById(knownIds, list, onUpdate, onInsert, onDelete) {
    for (let element of list) {
        const index = knownIds.indexOf(element.id);

        if (index > -1) { // update
            await onUpdate(element);
            knownIds.splice(index, 1); // remove used id

        }else{ // insert
            await onInsert(element);
        }
    }

    for (let knownId of knownIds) { // delete remaining
        await onDelete(knownId);
    }
}


export async function updateListByCompositeId(knownIds, fields, list, onUpdate, onInsert, onDelete) {
    for (let element of list) {
        const key = {}
        for(let f of fields) {
            key[f] = element[f]
        }

        let index = -1

        for(let i = 0; i < knownIds.length; i++) {
            const id = knownIds[i]
            let ok = true

            for(let f of fields)
                if(id[f] !== element[f]) {
                    ok = false
                    break
                }


            if(ok) {
                index = i
                break
            }
        }

        if (index > -1) { // update
            await onUpdate(element);
            knownIds.splice(index, 1); // remove used id

        }else{ // insert
            await onInsert(element);
        }
    }

    for (let knownId of knownIds) { // delete remaining
        await onDelete(knownId);
    }
}
