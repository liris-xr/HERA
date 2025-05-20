import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import * as THREE from "three";
import {actions} from "./actions.js";


export class Trigger extends SceneElementInterface{

    mesh;
    #geometry;
    #material;

    radius
    position;
    scale;

    action;





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

        if(triggerData.scale){
            this.scale = triggerData.scale;
        }
        else {
            this.scale = {x:1, y:1, z:1};
        }

        if (triggerData.action){
            this.action = triggerData.action;
        }
        else{
            this.action = actions.none;
        }

        this.mesh = this.load()
    }


    async load(){
        this.#geometry = new THREE.SphereGeometry( this.radius, 32, 16 );
        this.#material = new THREE.MeshBasicMaterial( { color: 0xccaacc } );
        this.mesh = new THREE.Mesh( this.#geometry, this.#material );
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

    getAction(){
        return this.action;
    }


    doAction(){
        actions[this.action]();
    }








}