export function runOnNonDraggingClick(event, cb){ //must be triggered on mousedown to catch drag
    let previousX = event.clientX;
    let previousY = event.clientY;

    window.addEventListener("mouseup", onMouseUp)

    function onMouseUp(event){
           if( compare(previousX, event.clientX) && compare(previousY, event.clientY)) cb(event);
           window.removeEventListener("mouseup", onMouseUp);
    }

    function compare(value, target){
        const delta = 2;
        return value >= (target - delta) && value <= (target + delta);
    }
}
