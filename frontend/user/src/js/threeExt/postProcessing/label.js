import {CSS2DObject} from "three/addons";

export class Label{
    content;
    position;

    label;
    timestampStart;
    timestampEnd;
    #htmlContent

    constructor(labelData) {
        this.content = labelData.text;
        if(labelData.position)
            this.position = labelData.position;
        else
            this.position = {x:0,y:0,z:0};

        this.timestampStart = labelData.timestampStart;
        this.timestampEnd = labelData.timestampEnd;
        this.init();
    }

    init(){
        const htmlLabel = this.#createHtmlLabel();
        this.setContent(this.content);

        this.label = new CSS2DObject(htmlLabel);
        this.label.position.set(this.position.x, this.position.y, this.position.z);
        this.label.center.set( 0.5, 1);
    }

    #createHtmlLabel(){
        let boundingBox = document.createElement( 'div' );
        boundingBox.style.display = 'flex';
        boundingBox.style.flexDirection = 'column';
        boundingBox.style.alignItems = 'center';
        boundingBox.style.justifyContent= 'center'
        boundingBox.style.position= 'relative';
        boundingBox.style.filter = 'drop-shadow(0px 0px 4px #00000088)';
        boundingBox.style.maxWidth = "50%";

        this.#htmlContent = document.createElement( 'div' );
        this.#htmlContent.style.backgroundColor = "#ffffff";
        this.#htmlContent.style.padding = "4px";
        this.#htmlContent.style.borderRadius = "4px";
        this.#htmlContent.style.textAlign = "justify";
        this.#htmlContent.style.pointerEvents = 'auto';

        let connector = document.createElement("div");
        connector.style.width = "4px"
        connector.style.height = "32px"
        connector.style.background = "#ffffff";
        connector.style.margin = 'auto'

        let pointer = document.createElement("div");
        pointer.style.width = "8px";
        pointer.style.height = "8px";
        pointer.style.backgroundColor = '#ffffff';
        pointer.style.borderRadius = "4px";
        pointer.style.position = "absolute";
        pointer.style.bottom = "0";
        pointer.style.left = "50%";
        pointer.style.transform = "translate(-50%, 50%)";

        boundingBox.appendChild(this.#htmlContent);
        boundingBox.appendChild(connector);
        boundingBox.appendChild(pointer);

        return boundingBox;
    }

    setContent(text){
        this.#htmlContent.innerHTML = text;
    }

    setVisible(visible){
        this.label.visible = visible;
    }


    shouldBeVisible(time){
        if(this.timestampStart == null) return false;
        if(this.timestampStart === 0) return true;
        if(this.timestampEnd == null && this.timestampStart < time) return true

        return this.timestampStart < time && time < this.timestampEnd;
    }

    pushToScene(scene){
        if(!this.label) return false;
        scene.add(this.label);
        return true;
    }
}
