import {CSS2DObject} from "three/addons";
import * as THREE from "three";
import {ref} from "vue";

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
        this.init();
    }

    init(){
        const htmlLabel = this.#createHtmlLabel();
        this.setContent(this.content);

        // this.label = new CSS2DObject(htmlLabel);
        this.label = this.#createXRLabel()

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

    #createXRLabel(options={}) { // nouvelle méthode, nécessaire pour la compatibilité VR
        const {
            font = '48px sans-serif',
            padding = 20,
            backgroundColor = 'rgba(0, 0, 0, 0.6)',
            textColor = 'white',
            scale = 0.25,
        } = options;

        // 1. Mesurer le texte
        const tmpCanvas = document.createElement('canvas');
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.font = font;
        const textWidth = tmpCtx.measureText(this.content).width;
        const textHeight = parseInt(font, 10);

        // Ajouter un padding autour du texte
        const canvasWidth = textWidth + padding * 2;
        const canvasHeight = textHeight + padding * 2;

        // 2. Créer le vrai canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        // Dessiner un fond pour le label
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Dessiner le texte
        ctx.font = font;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(this.content, canvasWidth / 2, canvasHeight / 2);

        // Créer la texture de Three.js à partir du canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; // améliore le rendu proche

        // 3. Créer un Sprite pour afficher le texte
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });

        const sprite = new THREE.Sprite(spriteMaterial);

        // Calculer l'échelle du Sprite en fonction du texte
        const worldWidth = scale * canvasWidth / 100;  // Conversion en mètres (en fonction de la taille du texte et de l'échelle)
        const worldHeight = scale * canvasHeight / 100; // Idem pour la hauteur
        sprite.scale.set(worldWidth, worldHeight, 1);

        // afficher le label au dessus des autres sprites, peut-être pas une bonne idée ?
        spriteMaterial.depthTest = false

        return sprite;
    }

    setContent(text){
        this.content = text;
        this.label = this.#createXRLabel();
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
