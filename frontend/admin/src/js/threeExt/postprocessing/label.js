import {CSS2DObject} from "three/addons";
import {computed, ref, watch} from "vue";
import {SelectableInterface} from "@/js/threeExt/interfaces/selectableInterface.js";
import {LoadableInterface} from "@/js/threeExt/interfaces/loadableInterface.js";
import {classes} from "@/js/utils/extender.js";

export class Label extends classes(SelectableInterface, LoadableInterface){
    content;
    id;
    position;
    onChanged
    timestampStart;
    timestampEnd;

    label;
    #htmlContent
    #selected;

    constructor(labelData) {
        super();
        this.content = ref(labelData.text);
        this.id = labelData.id;
        this.#selected = ref(false);

        this.timestampStart = labelData.timestampStart;
        this.timestampEnd= labelData.timestampEnd;

        if(labelData.position)
            this.position = labelData.position;
        else
            this.position = {x:0,y:0,z:0};

        watch(this.content, (value) => {
            this.setContent(value);
            this.runOnChanged();
        })
        this.init();
    }

    init(){
        const htmlLabel = this.#createHtmlLabel();
        this.setContent(this.content.value);

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
        this.#htmlContent.style.fontSize = "14px";
        this.#htmlContent.style.pointerEvents = 'auto';
        this.#htmlContent.classList.add("label-content")
        this.#htmlContent.id = this.id;

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

    getHtmlLabel(){
        return this.#createHtmlLabel();
    }

    setContent(content){
        this.#htmlContent.innerHTML = content;
    }

    setVisible(visible){
        this.label.visible = visible;
    }

    setSelected(selected){
        if (selected)
            this.#htmlContent.style.outline = "solid 4px var(--accentColor)"
        else
            this.#htmlContent.style.outline = "none";
        this.#selected.value = selected;
    }

    isSelected = computed(()=>this.#selected.value);

    pushToScene(scene){
        if(!this.label) return false;
        scene.add(this.label);
        return true;
    }

    getObject(){
        return this.label;
    }

    getResultPosition(){
        const result = {}
        result.x = this.getObject().position.x;
        result.y = this.getObject().position.y;
        result.z = this.getObject().position.z;
        return result;
    }

    getResultRotation(){
        return {x:0, y:0, z:0};
    }

    getResultScale(){
        return {x:1, y:1, z:1};
    }

    hasError = computed(()=>false)
    isLoading = computed(()=>false)

    runOnChanged(){
        if(this.onChanged)
            this.onChanged();
    }


    copyContentFrom(otherLabel){
        this.content.value = otherLabel.content.value;
        this.timestampStart = otherLabel.timestampStart;
        this.timestampEnd = otherLabel.timestampEnd;
    }
}
