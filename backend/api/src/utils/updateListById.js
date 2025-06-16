export async function updateListById(knownIds, list, onUpdate, onInsert, onDelete) {
    for (let element of list) {
        const index = knownIds.indexOf(element.id);

        if (index > -1) { //if the id is known : update
            await onUpdate(element);
            knownIds.splice(index, 1); //the id was used, so we remove it from the array

        }else{ //else : insert
            await onInsert(element);
        }
    }

    for (let knownId of knownIds) { //the element is not in the input list, so we only know his id
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

        if (index > -1) { //if the id is known : update
            await onUpdate(element);
            knownIds.splice(index, 1); //the id was used, so we remove it from the array

        }else{ //else : insert
            await onInsert(element);
        }
    }

    for (let knownId of knownIds) { //the element is not in the input list, so we only know his id
        await onDelete(knownId);
    }
}
