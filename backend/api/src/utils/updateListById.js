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
