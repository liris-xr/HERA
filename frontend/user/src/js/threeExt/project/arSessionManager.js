import {ArSceneManager} from "../scene/arSceneManager";
import {ArCamera} from "../lighting/arCamera";
import {ArRenderer} from "../rendering/arRenderer";
import {OrbitControls} from "three/addons";
import {computed, ref} from "vue";
import {LabelRenderer} from "@/js/threeExt/rendering/labelRenderer.js";

import {QrCodeManager} from "@/js/qrCode/qrCodeManager.js";





export class ArSessionManager {
    sceneManager;
    arCamera;
    arRenderer;
    labelRenderer

    shadowMapSize;
    controls;


    #isArRunning;

    domOverlay;
    domWidth;
    domHeight;

    binding
    webGlContext
    lastScanTime = 0;
    scanInterval = 5000; // MicroSeconde

    qrManager

    constructor(json) {
        this.shadowMapSize = 4096
        this.domWidth = 380;
        this.domHeight = 280;
        this.#isArRunning = ref(false);

        this.sceneManager = new ArSceneManager(json.scenes, this.shadowMapSize);
        this.arCamera = new ArCamera();

        this.arRenderer = new ArRenderer(this.shadowMapSize,1);
        this.labelRenderer = new LabelRenderer();

        this.sceneManager.onSceneChanged = function(){this.labelRenderer.clear()}.bind(this);

        this.qrManager = new QrCodeManager()

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


    async isArCompatible() {
        return navigator.xr && await navigator.xr.isSessionSupported("immersive-ar");
    }

    isArRunning = computed(() => {
        return this.#isArRunning.value;
    })


    async start() {
        this.reset();
        this.#isArRunning.value = true;


        this.arSession = await navigator.xr.requestSession(
            'immersive-ar',
            {
                requiredFeatures: ['camera-access','hit-test', 'dom-overlay',/*'light-estimation'*/],
                domOverlay: {
                    root: this.domOverlay
                }


            }
        );

        this.webGlContext = document.querySelector('canvas').getContext('webgl2');
        await this.webGlContext.makeXRCompatible();
        this.binding = new XRWebGLBinding(this.arSession, this.webGlContext);


        await this.onSessionStarted();
    }

    async onSessionStarted() {
        this.arSession.addEventListener( 'end', this.onSessionEnded.bind(this) );
        this.arRenderer.xr.setReferenceSpaceType( 'local' );
        await this.arRenderer.xr.setSession( this.arSession );
        this.referenceSpace = await this.arRenderer.xr.getReferenceSpace();
        this.viewerSpace = await this.arSession.requestReferenceSpace('viewer');
        this.sceneManager.scenePlacementManager.hitTestSource = await this.arSession.requestHitTestSource({space: this.viewerSpace, entityTypes: ['plane']});

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

        const viewerPose = frame.getViewerPose(this.referenceSpace);
        if (!viewerPose) {
            return;
        }

        const timeNow = Date.now();
        const shouldScanThisFrame = timeNow - this.lastScanTime > this.scanInterval;

        if (shouldScanThisFrame) {
            const camera = viewerPose.views[0].camera;
            if (camera) {
                this.lastScanTime = timeNow;

                const cameraTexture = this.binding.getCameraImage(camera);

                const imageToScan = this.#getImageData(cameraTexture, camera);

                this.qrManager.scanImageData(imageToScan).then(resultQrCodeScanner => {
                    if (resultQrCodeScanner) {
                        this.#changeScene(resultQrCodeScanner);

                        this.sceneManager.scenePlacementManager.reset();

                        this.sceneManager.scenePlacementManager.placementScene(
                            this.qrManager.transformationMatrix,
                            this.qrManager.centerQrCode,
                            this.sceneManager.getSceneActive()
                        );
                    }
                });
            }
        }

        if(this.sceneManager.active.value.hasLabels.value && this.labelRenderer.isEnabled.value) {
            this.labelRenderer.render(this.sceneManager.active.value, this.arCamera);
        }
        else{
            this.labelRenderer.clear();
        }
    }

    #changeScene(name){
        const scene = this.sceneManager.getScene(name)
        this.sceneManager.setScene(scene);
    }

    #getImageData(cameraTexture, camera) {
        const width = camera.width;
         const height = camera.height;

         const framebuffer = this.webGlContext.createFramebuffer();
         this.webGlContext.bindFramebuffer(this.webGlContext.FRAMEBUFFER, framebuffer);
         this.webGlContext.framebufferTexture2D(this.webGlContext.FRAMEBUFFER,
             this.webGlContext.COLOR_ATTACHMENT0,
             this.webGlContext.TEXTURE_2D,
             cameraTexture,
             0);

         const pixels = new Uint8Array(width * height * 4);
         this.webGlContext.readPixels(0, 0, width, height,
             this.webGlContext.RGBA,
             this.webGlContext.UNSIGNED_BYTE,
             pixels);

         const flipped = new Uint8ClampedArray(pixels.length);
         const rowSize = width * 4;
         for (let y = 0; y < height; y++) {
             const src = y * rowSize;
             const dst = (height - y - 1) * rowSize;
             flipped.set(pixels.subarray(src, src + rowSize), dst);
         }

         this.webGlContext.bindFramebuffer(this.webGlContext.FRAMEBUFFER, null);
         this.webGlContext.deleteFramebuffer(framebuffer);

         return new ImageData(flipped, width, height)
     }
}
