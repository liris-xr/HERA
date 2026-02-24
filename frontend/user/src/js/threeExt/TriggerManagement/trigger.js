import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from "three";
import {TriggerAction} from "@/js/threeExt/TriggerManagement/triggerAction.js";
import {ActionManager} from "@/js/threeExt/TriggerManagement/actionManager.js";

export class Trigger extends SceneElementInterface{
    id;

    mesh;

    hideInViewer

    radius
    position;
    scale;

    chainedActions;
    actionIn;
    actionOut;
    objectIn;
    objectOut;

    userInside;
    thereIsUser;

    isPlaying

    #startOffset
    #currentTime;
    #maxTimestamp;

     constructor(triggerData) {
        super();

        this.id = triggerData.id;

        if (triggerData.radius) {
            this.radius = triggerData.radius;
        } else {
            this.radius = 1;
        }

        if (triggerData.position) {
            this.position = triggerData.position;
        } else {
            this.position = {x: 0, y: 0, z: 0};
        }

        if (triggerData.hideInViewer) {
            this.hideInViewer = triggerData.hideInViewer;
        } else {
            this.hideInViewer = false;
        }

        if (triggerData.scale) {
            this.scale = triggerData.scale;
        } else {
            this.scale = {x: 1, y: 1, z: 1};
        }

        if (triggerData.actionIn) {
            this.actionIn = triggerData.actionIn;
        } else {
            this.actionIn = "none";
        }

        if (triggerData.actionOut) {
            this.actionOut = triggerData.actionOut;
        } else {
            this.actionOut = "none";
        }

        if (triggerData.objectIn) {
            this.objectIn = triggerData.objectIn;
        } else {
            this.objectIn = "none";
        }

        if (triggerData.objectOut) {
            this.objectOut = triggerData.objectOut;
        } else {
            this.objectOut = "none";
        }

        this.userInside = false;
        this.thereIsUser = false;

        this.mesh = this.load()

        this.chainedActions = [];
         this.#maxTimestamp = 0;
        for (let item of triggerData.chainedActions) {
            if (this.#maxTimestamp < item.timeStamp) {
                this.#maxTimestamp = item.timeStamp;
            }

            this.chainedActions.push(new TriggerAction(item));
        }

        this.isPlaying = false;
        this.#startOffset = 0;
        this.#currentTime = 0;
    }


     load(){
         const geometry = new THREE.SphereGeometry(this.radius, 32, 16);
         //const material = new THREE.MeshBasicMaterial( { color: 0x000000 } );
         //this.mesh = new THREE.Mesh( geometry, this );
         const wireframe = new THREE.WireframeGeometry(geometry);
         this.mesh = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0xeeebe3 }));


         this.mesh.position.set(this.position.x, this.position.y, this.position.z);
         this.mesh.scale.set(1, 1, 1);
         this.mesh.visible = !this.hideInViewer;

         return this.mesh;
    }

    pushToScene(scene){
        if(!this.mesh) return false;
        scene.add(this.mesh);
        return true;
    }

    getRadius(){
        return this.radius;
    }

    userIn(){
        this.userInside = true;
    }

    userOut(){
        this.userInside = false;
    }

    hasActions(){
        return this.chainedActions.length > 0;
    }

    onXrFrame(time, isArRunning) {
         if (!isArRunning) return ;
         if (!this.hasActions) return;

        const delta = time - this.#currentTime;
        this.#currentTime += delta;

        if (!this.isPlaying) {
            this.#startOffset += delta;
        }


        const previousUserInside = this.thereIsUser;
        this.thereIsUser = this.userInside;

        if (previousUserInside === true && this.thereIsUser === false) {
            this.actionOnPause();
            return
        }

         if (!this.thereIsUser){
            return;
        }

        const t = this.#currentTime - this.#startOffset;

        for (let action of this.chainedActions) {
            if(action.shouldBePlaying(t)){
                action.playAction();
            }
        }

        if(t>=this.#maxTimestamp) this.pause();
    }

    pause(){
        this.isPlaying = false;
    }

    play(){
        this.isPlaying = true;
    }

    reset(){
        this.pause();
        this.#startOffset = this.#currentTime
        for (let action of this.chainedActions) {
           action.reset();
        }

        this.userInside = false;
        this.thereIsUser = false;
    }

    actionOnPause(){
         this.pause();

        const ignoredActions = new Set([
            "sceneChange",
            "displayAsset",
            "displayTrigger"
        ]);

        for (let action of this.chainedActions) {
            if (!ignoredActions.has(action.getAction())) {
                action.pauseAction();
            }
        }
    }


    playActionOut(){
        const actionManager = new ActionManager()

        actionManager.doAction(this.actionOut, this.objectOut) ;
    }

    hide(state){
         this.mesh.visible = !state;
         this.hideInViewer = state;
    }
}