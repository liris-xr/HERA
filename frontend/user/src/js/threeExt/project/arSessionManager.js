import {ArSceneManager} from "../scene/arSceneManager";
import {ArCamera} from "../lighting/arCamera";
import {ArRenderer} from "../rendering/arRenderer";
import {OrbitControls} from "three/addons";
import {computed, ref} from "vue";
import {LabelRenderer} from "@/js/threeExt/rendering/labelRenderer.js";
import Stats from 'three/addons/libs/stats.module.js';
import {CustomBlending, Vector2} from "three";

export class ArSessionManager {
    sceneManager;
    arCamera;
    arRenderer;
    labelRenderer

    shadowMapSize;
    controls;

    #isArRunning;

    xrMode
    enable3dUI;

    domOverlay;
    domWidth;
    domHeight;

    constructor(json) {
        this.shadowMapSize = 4096
        this.domWidth = 380;
        this.domHeight = 280;
        this.#isArRunning = ref(false);
        this.enable3dUI = false
        
        this.sceneManager = new ArSceneManager(json.scenes, this.shadowMapSize);
        this.arCamera = new ArCamera();

        this.arRenderer = new ArRenderer(this.shadowMapSize,1);
        this.labelRenderer = new LabelRenderer();

        this.sceneManager.onSceneChanged = function(){
            this.labelRenderer.clear()
        }.bind(this);

        window.addEventListener("resize", this.onWindowResize.bind(this));
    }


    async init(container, arOverlay){
        await this.sceneManager.init();
        container.appendChild(this.arRenderer.domElement);
        arOverlay.firstChild.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls( this.arCamera, this.arRenderer.domElement);
        this.onWindowResize();

        this.domOverlay = arOverlay;
        this.arRenderer.setAnimationLoop(this.onXrFrame.bind(this));
    }

    #resetCameraPosition(){
        const radius = this.sceneManager.getBoundingSphere().radius
        const cog = this.sceneManager.getBoundingSphere().center.clone();
        const fov = this.arCamera.fov;
        const scale = .7
        this.arCamera.position.set( cog.x, cog.y +  scale*radius/Math.tan(fov*Math.PI/360), cog.z + scale*radius/Math.tan(fov*Math.PI/360) );

        this.controls.target.set(cog.x, cog.y, cog.z)
        this.controls.autoRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.update();
    }

    onWindowResize(){
        if(this.isArRunning.value){
            this.domWidth = window.innerWidth;
            this.domHeight = window.innerHeight;
        }else{
            this.arRenderer.domElement.style.width = "100%";
            this.domWidth = parseInt(window.getComputedStyle(this.arRenderer.domElement).getPropertyValue("width"));
            const ratio = 4/3;
            this.domHeight = this.domWidth/ratio;
        }

        this.#setSize(this.domWidth, this.domHeight);

        this.sceneManager.scenePlacementManager.reset();
        this.#resetCameraPosition();
    }

    #setSize(width, height) {
        this.arRenderer.setDomSize(width, height);
        this.labelRenderer.setDomSize(width, height);
        this.arCamera.setDomSize(width, height);
    }


    async isXrCompatible(mode="ar") {
        return navigator.xr && await navigator.xr.isSessionSupported("immersive-"+mode);
    }

    isArRunning = computed(() => {
        return this.#isArRunning.value;
    })


    async start(mode="ar") {
        // this.reset();
        this.#isArRunning.value = true

        const options = mode === "ar" ? {
            requiredFeatures: ['hit-test', 'dom-overlay',/*'light-estimation'*/],
            domOverlay: {
                root: this.domOverlay
            }
        } : {}

        try {
            this.arSession = await navigator.xr.requestSession(
                'immersive-' + mode,
                options
            )
        } catch(e) {
            if(e.name === "NotSupportedError") {
                // le dom-overlay n'est pas supporté
                this.enable3dUI = true
                this.arSession = await navigator.xr.requestSession(
                    'immersive-' + mode
                )
            }
        }

        this.xrMode = mode
        await this.onSessionStarted()
    }

    async onSessionStarted() {
        this.arSession.addEventListener( 'end', this.onSessionEnded.bind(this) );
        this.arRenderer.xr.setReferenceSpaceType( 'local' );
        await this.arRenderer.xr.setSession( this.arSession );
        this.referenceSpace = await this.arRenderer.xr.getReferenceSpace();
        this.viewerSpace = await this.arSession.requestReferenceSpace('viewer');


        if(this.xrMode === "ar") {
            this.sceneManager.scenePlacementManager.hitTestSource = await this.arSession.requestHitTestSource({space: this.viewerSpace});
        } else {
            this.sceneManager.scenePlacementManager.disable()
        }

        this.sceneManager.isArRunning.value = true;
    }



    async stop(){
        if(this.arSession != null)
            await this.arSession.end();
    }

    onSessionEnded() {
        this.arSession.removeEventListener( 'end', this.onSessionEnded.bind(this) );
        this.arSession = null;
        this.sceneManager.scenePlacementManager.hitTestSource = null
        this.#isArRunning.value = false;
        this.sceneManager.isArRunning.value = false;
        this.#resetCameraPosition()
    }

    reset() {
        this.sceneManager.reset();
    }

    onXrFrame(time, frame) {
        this.sceneManager.onXrFrame(time, frame, this.referenceSpace, this.arCamera.position);
        this.controls.update();

        this.arRenderer.render(this.sceneManager.active.value, this.arCamera);

        if(this.sceneManager.active.value.hasLabels.value && this.labelRenderer.isEnabled.value) {
            this.labelRenderer.render(this.sceneManager.active.value, this.arCamera);
        }else{
            this.labelRenderer.clear();
        }
    }





}
