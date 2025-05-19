import {OrbitControls, TransformControls} from "three/addons";
import {EditorRenderer} from "@/js/threeExt/rendering/editorRenderer.js";
import {LabelRenderer} from "@/js/threeExt/rendering/labelRenderer.js";
import {EditorScene} from "@/js/threeExt/editorScene.js";
import {EditorCamera} from "@/js/threeExt/lighting/editorCamera.js";
import {runOnNonDraggingClick} from "@/js/utils/click.js";

export class Editor {
    scene
    camera;
    renderer;
    labelRenderer

    shadowMapSize;
    orbitControls;

    domWidth;
    domHeight;

    onChanged;

    constructor() {
        this.shadowMapSize = 4096
        this.domWidth = 380;
        this.domHeight = 380;

        this.scene = new EditorScene(this.shadowMapSize);
        this.camera = new EditorCamera();

        this.renderer = new EditorRenderer(this.shadowMapSize,1);
        this.labelRenderer = new LabelRenderer();
        window.addEventListener("resize", this.onWindowResize.bind(this));
    }


    async init(json,container){
        await this.scene.init(json);
        container.appendChild(this.renderer.domElement);
        container.appendChild(this.labelRenderer.domElement);

        let transformControls = new TransformControls( this.camera, this.renderer.domElement );
        container.addEventListener(
            "mousedown",
            (event)=> runOnNonDraggingClick(event,(event) => {
                this.scene.onSceneClick(event, this.camera);
            }));

        transformControls.addEventListener( 'dragging-changed', function ( event ) {
            this.orbitControls.enabled = ! event.value;
            this.runOnChanged();
        }.bind(this) );
        this.scene.setupControls(transformControls);

        this.orbitControls = new OrbitControls( this.camera, this.renderer.domElement);

        this.onWindowResize();
        this.#resetCameraPosition();

        this.renderer.setAnimationLoop(this.onFrame.bind(this));
    }

    #resetCameraPosition(){
        this.camera.position.set(0,2,2);

        this.orbitControls.target.set(0,0,0)
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.update();
    }

    onWindowResize(){
        this.renderer.domElement.style.width = "100%";
        this.domWidth = parseInt(window.getComputedStyle(this.renderer.domElement).getPropertyValue("width"));
        const ratio = 1;
        this.domHeight = this.domWidth/ratio;

        this.#setSize(this.domWidth, this.domHeight);
    }

    #setSize(width, height) {
        this.renderer.setDomSize(width, height);
        this.labelRenderer.setDomSize(width, height);
        this.camera.setDomSize(width, height);
    }


    onFrame(time, frame) {

        this.scene.onFrame(time, frame, this.camera.position)
        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);


        if(this.scene.labelManager.hasLabels.value && this.labelRenderer.isEnabled.value) {
            this.labelRenderer.render(this.scene, this.camera);
        }else{
            this.labelRenderer.clear();
        }
    }


    runOnChanged(){
        if(this.onChanged)
            this.onChanged();
        this.scene.assetManager.runOnChanged();
    }
}
