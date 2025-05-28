import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from "three";

export class Trigger extends SceneElementInterface{

    mesh;

    hideInViewer

    radius
    position;
    scale;

    actionIn;
    actionOut;
    objectIn;
    objectOut;

    userInside;
    thereIsUser;

    constructor(triggerData) {
        super();

        if(triggerData.radius){
            this.radius = triggerData.radius;
        }
        else {
            this.radius = 1;
        }

        if(triggerData.position){
            this.position = triggerData.position;
        }
        else {
            this.position = {x:0, y:0, z:0};
        }

        if(triggerData.hideInViewer){
            this.hideInViewer = triggerData.hideInViewer;
        }
        else{
            this.hideInViewer = false;
        }

        if(triggerData.scale){
            this.scale = triggerData.scale;
        }
        else {
            this.scale = {x:1, y:1, z:1};
        }

        if (triggerData.actionIn){
            this.actionIn = triggerData.actionIn;
        }
        else{
            this.actionIn = "none";
        }

        if(triggerData.actionOut){
            this.actionOut = triggerData.actionOut;
        }
        else{
            this.actionOut = "none";
        }

        if (triggerData.objectIn){
            this.objectIn = triggerData.objectIn;
        }
        else{
            this.objectIn = "none";
        }

        if (triggerData.objectOut){
            this.objectOut = triggerData.objectOut;
        }
        else{
            this.objectOut = "none";
        }

        this.userInside = false;
        this.thereIsUser = false;

        this.mesh = this.load()
    }


    async load(){
        const geometry = new THREE.SphereGeometry(this.radius, 32, 16);
        //const material = new THREE.MeshBasicMaterial( { color: 0x000000 } );
        //this.mesh = new THREE.Mesh( geometry, this );
        const wireframe = new THREE.WireframeGeometry(geometry);
        this.mesh = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0xeeebe3 }));


        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
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
}