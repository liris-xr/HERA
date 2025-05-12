import {computed, shallowReactive} from "vue";
import * as THREE from "three";
import {BASE_URL} from "@/js/endpoints.js";

const vertexShader = `
#define STANDARD
varying vec3 vViewPosition;
out vec4 wPosition; 
out vec3 wNormal;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vec4 localPosition = vec4(position,1.);
	wPosition = modelMatrix * localPosition;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	wNormal = objectNormal; 

	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}
`

const fragShader = `
#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
uniform sampler3D sh0;
uniform sampler3D sh1;
uniform sampler3D sh2;

uniform sampler3D sh3;
uniform sampler3D sh4;
uniform sampler3D sh5;

uniform sampler3D sh6;
uniform sampler3D sh7;
uniform sampler3D sh8;

uniform sampler3D invalidity;
uniform sampler3D distanceFromGeometry;

uniform vec3 lpvCenter;
uniform float lpvWidth;
uniform float lpvDepth;
uniform float lpvHeight;

in vec4 wPosition;
in vec3 wNormal;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// r1,r2 : [0,1]
vec3 getRandomHemisphereDirection(vec3 n,float r1,float r2) {
		float phi = 2.*3.14159*r1;
		float theta = acos(r2); 

		float x = cos(phi) * sqrt(1.-(r2*r2));
		float y = sin(phi) * sqrt(1.-(r2*r2));
		float z = r2;

		vec3 dir = vec3(x,y,z);

		if(dot(n,dir) > 0.) {
			return dir;
		} else {
			return -dir; 
		}
	}
void main() {

	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif

	
	vec3 texcoord = vec3(
		(((wPosition.x-lpvCenter.x) / (lpvWidth/2.)) + 1.) / 2.,
		(((wPosition.z-lpvCenter.z) / (lpvDepth/2.)) + 1.) / 2.,
		(((wPosition.y-lpvCenter.y) / (lpvHeight/2.)) + 1.) / 2.
		);

	// vec3 displacedWorldPosition = wPosition.xyz;
	vec3 n = vec3(wNormal.x,wNormal.z,-wNormal.y);
	// if(texture(invalidity,texcoord).r > 0.0) {
	// 	vec3 displacement = normalize(n)*texture(distanceFromGeometry,texcoord).r;
	// 	displacedWorldPosition += displacement;
	// }

	// texcoord = vec3(
	// 	(((displacedWorldPosition.x-lpvCenter.x) / (lpvWidth/2.)) + 1.) / 2.,
	// 	(((displacedWorldPosition.z-lpvCenter.z) / (lpvDepth/2.)) + 1.) / 2.,
	// 	(((displacedWorldPosition.y-lpvCenter.y) / (lpvHeight/2.)) + 1.) / 2.
	// 	);
		
	vec3 interpolatedLightProbe[9] = vec3[9]( texture(sh0,texcoord).rgb,
		texture(sh1,texcoord).rgb,
		texture(sh2,texcoord).rgb,
		texture(sh3,texcoord).rgb,
		texture(sh4,texcoord).rgb,
		texture(sh5,texcoord).rgb,
		texture(sh6,texcoord).rgb,
		texture(sh7,texcoord).rgb,
		texture(sh8,texcoord).rgb
	);
	

	// outgoingLight = material.diffuseColor * probeIrradiance;
	outgoingLight = material.diffuseColor * getLightProbeIrradiance(interpolatedLightProbe,normal);
	// outgoingLight = n;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`

export class MeshManager {
    #meshes
	textureLoader
	shTextures;
	lpvParameters;

    constructor() {
        this.#meshes = shallowReactive([]);
		this.textureLoader = new THREE.TextureLoader();

		this.shTextures = [];
		for(let i = 0;i<9;i++) {
			fetch(BASE_URL+'textures/sh'+i+'.csv')
			.then((res) => res.text())
			.then((text) => {
				const values = text.split(',').map(Number);
				this.shTextures.push(new Float32Array(values));
			})
			.catch((e) => console.error(e));
		}

		fetch(BASE_URL+"textures/lpvParameters.json")
			.then((res) => res.json())
			.then((json) => {
				this.lpvParameters = json;
			})
			.catch((e) => console.error(e));
    }

    getMeshes = computed(()=>{
        return this.#meshes;
    });

    addSubMesh(scene,mesh,meshData) {
		
		mesh.material.customProgramCacheKey = () => {
			mesh.material.needsUpdate = true;
			return this.lpvParameters ? '1' : '0';
		}
        
        mesh.material.onBeforeCompile = (shader) => {
			
			if(this.lpvParameters) {
				shader.vertexShader = vertexShader;
				shader.fragmentShader = fragShader;

				for(let i = 0;i<9;i++) {
					const sh3DTexture = new THREE.Data3DTexture(this.shTextures[i], 
																this.lpvParameters.width*this.lpvParameters.density,
																this.lpvParameters.depth*this.lpvParameters.density,
																this.lpvParameters.height*this.lpvParameters.density);
					sh3DTexture.magFilter = THREE.LinearFilter;
					sh3DTexture.type = THREE.FloatType;
					sh3DTexture.wrapS = THREE.ClampToEdgeWrapping
					sh3DTexture.wrapT = THREE.ClampToEdgeWrapping
					sh3DTexture.wrapR = THREE.ClampToEdgeWrapping
					sh3DTexture.needsUpdate = true;
					
					shader.uniforms["sh"+i] = {value: sh3DTexture};
				}

				// const invalidityTexture = new THREE.Data3DTexture(scene.invalidityTexture,scene.shTexturesWidth,scene.shTexturesDepth,scene.shTexturesHeight);
				// invalidityTexture.format = THREE.RedFormat
				// invalidityTexture.magFilter = THREE.LinearFilter;
				// invalidityTexture.type = THREE.FloatType;
				// invalidityTexture.wrapS = THREE.ClampToEdgeWrapping
				// invalidityTexture.wrapT = THREE.ClampToEdgeWrapping
				// invalidityTexture.wrapR = THREE.ClampToEdgeWrapping
				// invalidityTexture.needsUpdate = true;
				// shader.uniforms["invalidity"] = {value:invalidityTexture}

				// const distanceFromGeometryTexture = new THREE.Data3DTexture(scene.distanceFromGeometryTexture,scene.shTexturesWidth,scene.shTexturesDepth,scene.shTexturesHeight);
				// distanceFromGeometryTexture.format = THREE.RedFormat
				// distanceFromGeometryTexture.magFilter = THREE.LinearFilter;
				// distanceFromGeometryTexture.type = THREE.FloatType;
				// distanceFromGeometryTexture.wrapS = THREE.ClampToEdgeWrapping
				// distanceFromGeometryTexture.wrapT = THREE.ClampToEdgeWrapping
				// distanceFromGeometryTexture.wrapR = THREE.ClampToEdgeWrapping
				// distanceFromGeometryTexture.needsUpdate = true;
				// shader.uniforms["distanceFromGeometry"] = {value:distanceFromGeometryTexture}

				shader.uniforms.lpvCenter = {value : new THREE.Vector3(this.lpvParameters.center.x,this.lpvParameters.center.y,this.lpvParameters.center.z)};
				shader.uniforms.lpvWidth = {value : this.lpvParameters.width};
				shader.uniforms.lpvDepth = {value : this.lpvParameters.depth};
				shader.uniforms.lpvHeight = {value : this.lpvParameters.height};
			}
			
        }



        if(meshData) {
            mesh.position.x = meshData.position.x 
            mesh.position.y = meshData.position.y 
            mesh.position.z = meshData.position.z 
            
            mesh.rotation.x = meshData.rotation._x
            mesh.rotation.y = meshData.rotation._y
            mesh.rotation.z = meshData.rotation._z
            mesh.scale.x = meshData.scale.x
            mesh.scale.y = meshData.scale.y
            mesh.scale.z = meshData.scale.z
            
            mesh.material.color = meshData.color
            mesh.material.transparent = meshData.opacity < 1
            mesh.material.opacity = meshData.opacity
            mesh.material.emissive = meshData.emissive
            mesh.material.emissiveIntensity = meshData.emissiveIntensity
            mesh.material.roughness = meshData.roughness
            mesh.material.metalness = meshData.metalness
        }
        
        scene.add( mesh );
        this.#meshes.push(mesh)
    }

    clear(scene) {
        this.#meshes.forEach( (mesh) => {
            scene.remove(mesh)
        })
        this.#meshes = []
    }
}