export async function updateListById(knownIds, list, onUpdate, onInsert, onDelete) {
    for (let element of list) {
        const index = knownIds.indexOf(element.id);

        if (index > -1) { //if the id is known : update
            await onUpdate(element);
            knownIds.splice(index, 1); //the id was used, so we remove it from the array
            console.log("updated " + element.id)

        }else{ //else : insert
            await onInsert(element);
            console.log("added "+ element.id);
        }
    }

    for (let knownId of knownIds) { //the element is not in the input list, so we only know his id
        await onDelete(knownId);
        console.log("deleted " + knownId)
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
                    console.log(id[f], "!=", element[f], id, element, f)
                    ok = false
                    break
                } else
                    console.log(id[f], "==", element[f], id, element, f)


            if(ok) {
                index = i
                break
            }
        }

        console.log("datatest", element, key, index, list)

        if (index > -1) { //if the id is known : update
            await onUpdate(element);
            knownIds.splice(index, 1); //the id was used, so we remove it from the array
            console.log("updated " + element.id)

        }else{ //else : insert
            await onInsert(element);
            console.log("added "+ element.id);
        }
    }

    for (let knownId of knownIds) { //the element is not in the input list, so we only know his id
        await onDelete(knownId);
        console.log("deleted " + knownId)
    }
}
