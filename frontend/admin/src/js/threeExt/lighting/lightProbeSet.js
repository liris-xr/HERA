import * as THREE from "three";
import {SceneElementInterface} from "@/js/threeExt/interfaces/sceneElementInterface.js";
import {classes} from "@/js/utils/extender.js"

export class LightProbeSet extends classes(THREE.Group,SceneElementInterface) {

    constructor(center,density,width,length,height,scene,dir) {
        super();


		

        // const red = new THREE.Color(1,0,0)
        // const blue = new THREE.Color(0,0,1)

        // const freq = 1/density;
        // for(let x = -width/2;x<width/2;x = x + freq) {
        //     for(let z = -length/2;z<length/2;z = z + freq) {
        //         for(let y = -height/2;y<height/2;y = y + freq) {
        const shBasis = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
        

        const sh = new THREE.SphericalHarmonics3();
        const shCoefficients = sh.coefficients;
        
        // evaluate SH basis functions in direction dir
        THREE.SphericalHarmonics3.getBasisAt( dir, shBasis );
        
        const color =  new THREE.Color(1,1,1);
        
        // accumulate
        for ( let j = 0; j < 9; j ++ ) {
            
            shCoefficients[ j ].x += shBasis[ j ] * color.r;
            shCoefficients[ j ].y += shBasis[ j ] * color.g;
            shCoefficients[ j ].z += shBasis[ j ] * color.b;
            
        }
        console.log(shCoefficients);
        
        
        const pos = new THREE.Vector3(0,3,0)
        const newProbe = new THREE.LightProbe(sh)
        newProbe.position.copy(pos);
        this.add(newProbe)

        const geometry = new THREE.SphereGeometry(0.1,30,30) 
        const material = new THREE.MeshBasicMaterial( { color: color } ); 
        const sphere = new THREE.Mesh( geometry, material ); 
        sphere.position.copy(pos)
        scene.add( sphere );
                    // console.log(scene);
                    
        //         }
        //     }
        // }
        console.log(this);
        
        
    }
}
