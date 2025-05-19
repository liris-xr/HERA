import {CSS2DObject} from "three/addons";
import {ref} from "vue";
import * as THREE from "three";
import html2canvas from "html2canvas";

export class Label{
    id;
    content;
    position;
    hidden

    label;
    timestampStart;
    timestampEnd;
    #htmlContent

    constructor(labelData) {
        this.id = labelData.id
        this.content = labelData.text;
        if(labelData.position)
            this.position = labelData.position;
        else
            this.position = {x:0,y:0,z:0};

        this.timestampStart = labelData.timestampStart;
        this.timestampEnd = labelData.timestampEnd;

        this.hidden = ref(false)
    }

    async init(){
        const htmlLabel = this.#createHtmlLabel();
        this.setContent(this.content);

        document.body.appendChild(htmlLabel)
        const canvas = await html2canvas(htmlLabel, {backgroundColor: null, allowTaint: true, useCORS: true})
        htmlLabel.remove()

        document.body.appendChild(canvas)
        const texture = new THREE.CanvasTexture(canvas)
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
        console.log(canvas.width, canvas.height)

        const geometry = new THREE.PlaneGeometry(canvas.width/300, canvas.height/300)

        const mesh = new THREE.Mesh(geometry, material)
        this.label = mesh


        // this.label = new CSS2DObject(htmlLabel);

        console.log(this.label)

        this.label.position.set(this.position.x, this.position.y, this.position.z);
        // this.label.center.set( 0.5, 1);
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
        this.#htmlContent.style.border = "solid 1px #00000088"


        let connector = document.createElement("div");
        connector.style.width = "4px"
        connector.style.height = "32px"
        connector.style.background = "#ffffff";
        connector.style.margin = 'auto'
        connector.style.border = "solid 1px #00000088"

        let pointer = document.createElement("div");
        pointer.style.width = "8px";
        pointer.style.height = "8px";
        pointer.style.backgroundColor = '#ffffff';
        pointer.style.borderRadius = "4px";
        pointer.style.position = "absolute";
        pointer.style.bottom = "0";
        pointer.style.left = "50%";
        pointer.style.transform = "translate(-50%, 50%)";
        pointer.style.border = "solid 1px #00000088"

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
        this.checkHidden()
    }

    setHidden(hidden) {
        this.hidden.value = hidden;
        if(hidden) this.label.visible = false;
    }

    checkHidden() {
        if(this.hidden.value) this.label.visible = false
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
