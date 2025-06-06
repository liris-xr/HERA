import * as THREE from "three";
import {ObjectManager} from "@/js/threeExt/modelManagement/objectManager.js";
import {computed, ref} from "vue";
import {ArMeshLoadError} from "@/js/threeExt/error/arMeshLoadError.js";
import {ShadowPlane} from "@/js/threeExt/lighting/shadowPlane.js";
import {ToggleableInterface} from "@/js/threeExt/interfaces/ToggleableInterface.js";
import {classes} from "@/js/utils/extender.js";
import {AbstractScene} from "@/js/threeExt/scene/abstractScene.js";
import {extractYawQuaternion} from "@/js/utils/extractYawQuaternion.js";


export class ScenePlacementManager extends classes(AbstractScene, ToggleableInterface){

    pointerObject;
    #pointerUrl;
    hitTestSource;

    #shadowPlane
    #foundPlane;
    #isEnabled;

    #errors;


    constructor() {
        super();
        this.#foundPlane = ref(false);
        this.#isEnabled = ref(false);
        this.#errors = [];
        this.#pointerUrl = "public/common/cursor.glb";
    }

    async init() {
        const manager = ObjectManager.getInstance();
        const object = await manager.load(this.#pointerUrl);
        if(object.hasError())
            this.#errors.push(new ArMeshLoadError(this.#pointerUrl));
        this.pointerObject = object.object;
        this.pointerObject.castShadow = true;
        this.pointerObject.visible = false;
        this.pointerObject.matrixAutoUpdate = false;
        this.add(this.pointerObject);

        const boundingBox = new THREE.Box3().setFromObject(this.pointerObject);
        this.#shadowPlane = new ShadowPlane(boundingBox);
        this.#shadowPlane.pushToScene(this);
    }

    hasDescription(){
        return false;
    }

    hasLabels = computed(()=>{
        return false;
    })

    hasAnimation = computed(()=>false)

    resetLabels(){}

    enable(){
        this.#isEnabled.value = true;
    }
    disable(){
        this.#isEnabled.value = false;
        this.pointerObject.visible = false;
        this.#shadowPlane.visible = false;
    }

    reset(reenable=true){
        this.pointerObject.position.set(0, 0, 0);
        this.pointerObject.rotation.set(0, 0, 0);
        this.pointerObject.updateMatrix();
        this.#foundPlane.value = false;
        this.pointerObject.visible = false;
        if(reenable)
            this.enable();
    }

    isEnabled = computed(() =>{
        return this.#isEnabled.value;
    })


    getWorldTransformMatrix(){
        return this.pointerObject.matrix;
    }

    getErrors = computed(()=>{
        return this.#errors;
    })

    pushToScene(scene){
        scene.add(this.pointerObject);
        this.#shadowPlane.pushToScene(scene);
    }
    isStabilized = computed(() => this.#foundPlane.value);

    onXrFrame(time, frame, localReferenceSpace, worldTransformMatrix, camera){
        if(!this.isEnabled.value) return;
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        if (hitTestResults.length > 0) {
            this.pointerObject.visible = true;
            const hitPose = hitTestResults[0].getPose(localReferenceSpace);

            // Le hittest ne donnant pas la bonne orientation sur meta quest, on la recalcule à la main
            const position = new THREE.Vector3(
                hitPose.transform.position.x,
                hitPose.transform.position.y,
                hitPose.transform.position.z
            );
            const unit = new THREE.Vector3().subVectors(position, camera.position).normalize()
            const direction = extractYawQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), unit))

            const matrix = new THREE.Matrix4().fromArray( hitPose.transform.matrix )
            const scale = new THREE.Vector3()

            matrix.decompose(position, new THREE.Quaternion(), scale)
            matrix.compose(position, direction, scale)


            this.pointerObject.matrix.copy( matrix );
            this.pointerObject.updateWorldMatrix(true);

            this.#shadowPlane.visible = true
            this.#shadowPlane.matrixAutoUpdate = false;
            this.#shadowPlane.matrix.copy( matrix );
            this.#shadowPlane.applyQuaternion(direction);
            this.#shadowPlane.updateWorldMatrix(true);

            this.#foundPlane.value = true;

        }else{
            this.#foundPlane.value = false;
            this.pointerObject.visible = false;
            this.#shadowPlane.visible = false;

        }
    }

}
