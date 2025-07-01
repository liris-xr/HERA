import {computed, shallowReactive} from "vue";
import * as THREE from "three";
import {BASE_URL} from "@/js/endpoints.js";

const vertexShader = `
#define STANDARD
varying vec3 vViewPosition;
out vec4 wPosition; 
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

uniform sampler3D depthMapAtlas;

uniform sampler3D sh0;
uniform sampler3D sh1;
uniform sampler3D sh2;

uniform sampler3D sh3;
uniform sampler3D sh4;
uniform sampler3D sh5;

uniform sampler3D sh6;
uniform sampler3D sh7;
uniform sampler3D sh8;

uniform vec3 lpvCenter;
uniform float lpvWidth;
uniform float lpvDepth;
uniform float lpvHeight;
uniform float lpvTextureWidth;
uniform float lpvTextureHeight;
uniform float lpvTextureDepth;
uniform float lpvDensity;
uniform float freqX;
uniform float freqY;
uniform float freqZ;
uniform float worldFreq;

uniform float atlasFreqX;
uniform float atlasFreqZ;

uniform float depthMapSize;
uniform float halfDepthMapSize;
uniform float depthMapHalfSizeX;
uniform float depthMapHalfSizeZ;


in vec4 wPosition;
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

float square(float x) {
	return x*x;
}

// Considering a point in a cube,
//    6 -----  7	
//   / |     / |
//	/  |	/  |
// 4 ---- 5    |
// |   |  |    |
// |   2 -|--- 3	
// |  /   |  /	
// | /	  |	/ 
// 0 ---- 1
// Depending of the cube texcoord is in, we want to get the coord of i

vec3 getITexcoord(int i,vec3 texcoord) {
	float x = float(int(texcoord.x*lpvTextureWidth))/lpvTextureWidth;
	float y = float(int(texcoord.y*lpvTextureDepth))/lpvTextureDepth;
	float z = float(int(texcoord.z*lpvTextureHeight))/lpvTextureHeight;

	if(i == 0) {
		return vec3(x,y,z);
	} else if(i == 1) {
		return vec3(x+freqX,y,z);
	} else if(i == 2) {
		return vec3(x,y+freqZ,z); 
	} else if(i == 3) {
		return vec3(x+freqX,y+freqZ,z);
	} else if(i == 4) {
		return vec3(x,y,z+freqY); 
	} else if(i == 5) {
	 	return vec3(x+freqX,y,z+freqY);
	} else if(i == 6) {
		return vec3(x,y+freqZ,z+freqY); 
	} else if(i == 7) {
		return vec3(x+freqX,y+freqZ,z+freqY); 
	}
}

vec3 getIProbeWorldPosition(int i, vec3 texcoord ) {
	vec3 itexcoord = getITexcoord(i,texcoord);
	float x = ((lpvWidth * ((2.0*itexcoord.x)-1.0)) / 2.0) + lpvCenter.x;
	float y = ((lpvHeight * ((2.0*itexcoord.z)-1.0)) / 2.0) + lpvCenter.y;
	float z = ((lpvDepth * ((2.0*itexcoord.y)-1.0)) / 2.0) + lpvCenter.z;

	return vec3(x,y,z);
}

void getProbeSH(int i,vec3 texcoord, inout vec3[9] probeSH) {
	probeSH = vec3[9]( texture(sh0,getITexcoord(i,texcoord)).rgb,
					texture(sh1,getITexcoord(i,texcoord)).rgb,
					texture(sh2,getITexcoord(i,texcoord)).rgb,
					texture(sh3,getITexcoord(i,texcoord)).rgb,
					texture(sh4,getITexcoord(i,texcoord)).rgb,
					texture(sh5,getITexcoord(i,texcoord)).rgb,
					texture(sh6,getITexcoord(i,texcoord)).rgb,
					texture(sh7,getITexcoord(i,texcoord)).rgb,
					texture(sh8,getITexcoord(i,texcoord)).rgb
				  );
}

void linearProbeInterpolation(vec3[9] a, vec3[9] b, float v, inout vec3[9] probeSH) {
	for(int i = 0;i<9;i++) {
		probeSH[i] = mix(a[i],b[i],v);
	}
}

void getMaskedProbeInterpolation(int ai, int bi, bool aMask, bool bMask,float v,vec3 texcoord,inout vec3[9] probeSH) {
	if(aMask && bMask) {
		vec3[9] a;
		vec3[9] b;
		getProbeSH(ai,texcoord,a);
		getProbeSH(bi,texcoord,b);
		linearProbeInterpolation(a,b,v,probeSH);
	} else if(aMask) {
		getProbeSH(ai,texcoord,probeSH);
	} else if(bMask) {
		getProbeSH(bi,texcoord,probeSH);
	} else {
		probeSH[0] = vec3(3.0,0,0);
	}
}

void getProbeInterpolation(vec3[9] a, vec3[9] b,float v,inout vec3[9] probeSH) {
	if(a[0].x != 3.0 && b[0].x != 3.0) {
		linearProbeInterpolation(a,b,v,probeSH);
	} else if(a[0].x != 3.0) {
		probeSH = a;
	} else if(b[0].x != 3.0) {
		probeSH = b;
	} else {
		probeSH[0] = vec3(3.0,0,0);
	}
}


// Source : gkit2light, Jean-Claude Iehl
vec2 intersectTriangle(vec3 triangleOrigin, vec3 e1, vec3 e2, vec3 origin, vec3 direction) {
	vec3 pvec= cross(direction, e2);
	float det= dot(e1, pvec);
	
	float inv_det= 1.0 / det;
	vec3 tvec = origin - triangleOrigin;
	
	float u= dot(tvec, pvec) * inv_det;
	
	vec3 qvec= cross(tvec, e1);
	float v= dot(direction, qvec) * inv_det;
	
	return vec2(u, v);   
}

void intersectOctMap(in vec3 direction, in vec3 texcoord, inout vec2 uv, inout vec2 texcoordTriangleOrigin, inout vec2 texcoordTriangleE1, inout vec2 texcoordTriangleE2) {
	if(direction.x > 0.0) { // Right side of the depthmap 
		if(direction.z > 0.0) { // Upper side of the depthmap
			if(direction.y > 0.0) { // Bottom triangle
				uv = intersectTriangle(vec3(0,1,0),vec3(1,-1,0),vec3(0,-1,1),vec3(0,0,0),direction);

				texcoordTriangleOrigin = vec2(	texcoord.x + depthMapHalfSizeX + atlasFreqX,
												texcoord.y + depthMapHalfSizeZ + atlasFreqZ);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,0);
				texcoordTriangleE2 = vec2(0,depthMapHalfSizeZ);

			} else { // Upper triangle
				uv = intersectTriangle(vec3(0,0,1),vec3(1,0,-1),vec3(0,-1,-1),vec3(0,0,0),direction);

				texcoordTriangleOrigin = vec2(	texcoord.x + depthMapHalfSizeX + atlasFreqX,
												texcoord.y + (depthMapHalfSizeZ*2.0) + atlasFreqZ);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,-depthMapHalfSizeZ);
				texcoordTriangleE2 = vec2(depthMapHalfSizeX,0);

			}
			
		} else { // Bottom side of the depthmap
			texcoordTriangleOrigin = vec2(	texcoord.x + depthMapHalfSizeX + atlasFreqX,
											texcoord.y + atlasFreqZ);
			if(direction.y > 0.0) { // Top triangle
				uv = intersectTriangle(vec3(0,0,-1),vec3(1,0,1),vec3(0,1,1),vec3(0,0,0),direction);
				
				texcoordTriangleE1 = vec2(depthMapHalfSizeX,depthMapHalfSizeZ);
				texcoordTriangleE2 = vec2(0,depthMapHalfSizeZ);

			} else { // Bottom triangle
				uv = intersectTriangle(vec3(0,0,-1),vec3(0,-1,1),vec3(1,0,1),vec3(0,0,0),direction);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,0);
				texcoordTriangleE2 = vec2(depthMapHalfSizeX,depthMapHalfSizeZ);

			}
		}
	} else { // Left side of the depthmap 
	 	if(direction.z > 0.0) { // Upper side of the depthmap
			texcoordTriangleOrigin = vec2(	texcoord.x + atlasFreqX,
											texcoord.y + depthMapHalfSizeZ + atlasFreqZ);

			if(direction.y > 0.0) { // Bottom triangle
				uv = intersectTriangle(vec3(-1,0,0),vec3(1,1,0),vec3(1,0,1),vec3(0,0,0),direction);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,0);
				texcoordTriangleE2 = vec2(depthMapHalfSizeX,depthMapHalfSizeZ);

			} else { // Upper triangle
				uv = intersectTriangle(vec3(-1,0,0),vec3(1,0,1),vec3(1,-1,0),vec3(0,0,0),direction);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,depthMapHalfSizeZ);
				texcoordTriangleE2 = vec2(0,depthMapHalfSizeZ);
			}
		} else { // Bottom side of the depthmap
		 	if(direction.y > 0.0) { // Top triangle
				uv = intersectTriangle(vec3(-1,0,0),vec3(1,0,-1),vec3(1,1,0),vec3(0,0,0),direction);

				texcoordTriangleOrigin = vec2(	texcoord.x + atlasFreqX,
												texcoord.y + depthMapHalfSizeZ + atlasFreqZ);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,-depthMapHalfSizeZ);
				texcoordTriangleE2 = vec2(depthMapHalfSizeX,0);

			} else { // Bottom triangle
				uv = intersectTriangle(vec3(0,-1,0),vec3(0,1,-1),vec3(-1,1,0),vec3(0,0,0),direction);

				texcoordTriangleOrigin = vec2(	texcoord.x + atlasFreqX,
												texcoord.y + atlasFreqZ);

				texcoordTriangleE1 = vec2(depthMapHalfSizeX,0);
				texcoordTriangleE2 = vec2(0,depthMapHalfSizeZ);
			}
		}
	}
}

float getProbeDepthMap(vec3 texcoord) {
	return texture(depthMapAtlas,vec3(texcoord.x,texcoord.y,0.)).r;
}

vec2 getIJ(vec3 texcoord) {
	return vec2 ( 
				(mod(texcoord.x , freqX)) * lpvTextureWidth * (depthMapSize + 2.),
				(mod(texcoord.y , freqY)) * lpvTextureDepth * (depthMapSize + 2.)
			);	
} 

vec3 getOctVector(vec3 texcoord) {
	vec2 ij = getIJ(texcoord);

	
	
	float i = ij.x;
	float j = ij.y;
	if(i < 1. || i > 17. || j < 1. || j > 17.) {
		return vec3(0,3.0,0);	
	} else {
		i -= 1.; 
		j -= 1.; 
	}
	vec3 p = vec3(i,j,0);

	float a1, a2, a3;
    // Down Left Square
    if(i <halfDepthMapSize && j < halfDepthMapSize) {
        if((i+j) < halfDepthMapSize) {
            // Interpolation between DOWN (down left corner), BACKWARD and LEFT
            a1 = abs(cross(p-vec3(0,0,0),vec3(halfDepthMapSize,0,0)).z); // Left coef
            a2 = abs(cross(p-vec3(halfDepthMapSize,0,0),vec3(-halfDepthMapSize,halfDepthMapSize,0)).z); // Down coef
            a3 = abs(cross(p-vec3(0,halfDepthMapSize,0),vec3(0,-halfDepthMapSize,0)).z); // Backward coef

            vec3 pb = p-vec3(halfDepthMapSize,0,0);
            vec3 ul = vec3(-halfDepthMapSize,halfDepthMapSize,0);
    
            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;
            
            return normalize(vec3(-1,0,0)*a1 + vec3(0,-1,0)*a2 + vec3(0,0,-1)*a3); 
        } else {
            // Interpolation between BACKWARD, UP and LEFT
            a1 = abs(cross(p-vec3(halfDepthMapSize,0,0),vec3(0,halfDepthMapSize,0)).z); // Left coef
            a2 = abs(cross(p-vec3(halfDepthMapSize,halfDepthMapSize,0),vec3(-halfDepthMapSize,0,0)).z); // Backward coef
            a3 = abs(cross(p-vec3(0,halfDepthMapSize,0),vec3(halfDepthMapSize,-halfDepthMapSize,0)).z); // Up coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(vec3(-1,0,0)*a1 + vec3(0,0,-1)*a2 + vec3(0,1,0)*a3); 
        }
    }

    // Up Left Square
    if(i < halfDepthMapSize && j >= halfDepthMapSize) {
        if((j-i) >= halfDepthMapSize) {
            // Interpolation between LEFT, FORWARD and DOWN
            a1 = cross(p-vec3(0,halfDepthMapSize,0),vec3(halfDepthMapSize,halfDepthMapSize,0)).z; // Down coef
            a2 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize*2.,0),vec3(-halfDepthMapSize,0,0)).z; // Left coef
            a3 = cross(p-vec3(0,halfDepthMapSize*2.,0),vec3(0,-halfDepthMapSize,0)).z; // Forward coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(vec3(0,-1,0)*a1 + vec3(-1,0,0)*a2 + vec3(0,0,1)*a3); 
        } else {
            // Interpolation between UP, FORWARD and LEFT
            a1 = cross(p-vec3(0,halfDepthMapSize,0),vec3(halfDepthMapSize,0,0)).z; // Forward coef
            a2 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize,0),vec3(0,halfDepthMapSize,0)).z; // Left coef
            a3 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize*2.,0),vec3(-halfDepthMapSize,-halfDepthMapSize,0)).z; // Up coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(vec3(0,0,1)*a1 + vec3(-1,0,0)*a2 + vec3(0,1,0)*a3); 
        }
    }

    // Down right square
    if(i >= halfDepthMapSize && j < halfDepthMapSize) {
        if((i-j) >= halfDepthMapSize) {
            // Interpolation between BACKWARD, DOWN and RIGHT
            a1 = cross(p-vec3(halfDepthMapSize,0,0),vec3(halfDepthMapSize,0,0)).z; // Right coef
            a2 = cross(p-vec3(halfDepthMapSize*2.,0,0),vec3(0,halfDepthMapSize,0)).z; // Backward coef
            a3 = cross(p-vec3(halfDepthMapSize*2.,halfDepthMapSize,0),vec3(-halfDepthMapSize,-halfDepthMapSize,0)).z; // Down coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(vec3(1,0,0)*a1 + vec3(0,0,-1)*a2 + vec3(0,-1,0)*a3); 
        } else {
            // Interpolation between BACKWARD, RIGHT and UP
            a1 = cross(p-vec3(halfDepthMapSize,0,0),vec3(halfDepthMapSize,halfDepthMapSize,0)).z; // Up coef
            a2 = cross(p-vec3(halfDepthMapSize*2.,halfDepthMapSize,0),vec3(-halfDepthMapSize,0,0)).z; // Backward coef
            a3 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize,0),vec3(0,-halfDepthMapSize,0)).z; // Right coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(vec3(0,1,0)*a1 + vec3(0,0,-1)*a2 + vec3(1,0,0)*a3); 
        }
    }
    // Up right square
    if(i>=halfDepthMapSize && j>=halfDepthMapSize) {
        if((i+j) < halfDepthMapSize*3.) {
            // Interpolation between UP, RIGHT and FORWARD
            a1 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize,0),vec3(halfDepthMapSize,0,0)).z; // Forward coef
            a2 = cross(p-vec3(halfDepthMapSize*2.,halfDepthMapSize,0),vec3(-halfDepthMapSize,halfDepthMapSize,0)).z; // Up coef
            a3 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize*2.,0),vec3(0,-halfDepthMapSize,0)).z; // Right coef
    
            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;
    
            return normalize(vec3(0,0,1)*a1 + vec3(0,1,0)*a2 + vec3(1,0,0)*a3); 
        } else {
            // Interpolation between DOWN, FORWARD, RIGHT
            a1 = cross(p-vec3(halfDepthMapSize*2.,halfDepthMapSize,0),vec3(0,halfDepthMapSize,0)).z; // Forward coef 
            a2 = cross(p-vec3(halfDepthMapSize*2.,halfDepthMapSize*2.,0),vec3(-halfDepthMapSize,0,0)).z; // Right coef
            a3 = cross(p-vec3(halfDepthMapSize,halfDepthMapSize*2.,0),vec3(halfDepthMapSize,-halfDepthMapSize,0)).z; // Down coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(vec3(0,0,1)*a1 + vec3(1,0,0)*a2 + vec3(0,-1,0)*a3); 
        }
    }
}

vec2 getProbeZBuffer(vec3 direction, vec3 texcoord, int i) {
	vec3 iTexcoord = getITexcoord(i,texcoord); 
	vec2 uv;
	vec2 texcoordTriangleOrigin;
	vec2 texcoordTriangleE1;
	vec2 texcoordTriangleE2;

	intersectOctMap(direction,iTexcoord,uv,texcoordTriangleOrigin,texcoordTriangleE1,texcoordTriangleE2);

	vec2 depthTexcoord = vec2(texcoordTriangleOrigin.x, texcoordTriangleOrigin.y)
								+ texcoordTriangleE1*uv.x
								+ texcoordTriangleE2*uv.y;

	return texture(depthMapAtlas,vec3(depthTexcoord.x,depthTexcoord.y,iTexcoord.z)).rg;
}

bool isProbeVisible(vec3 p, vec3 texcoord,int i,vec3 n) {
	vec3 probePos = getIProbeWorldPosition(i,texcoord);
	vec3 probeToP = p - probePos + (n) * 0.05;

	float distanceFromProbe = length(probeToP);

	float probeZ = getProbeZBuffer(normalize(probeToP),texcoord,i).r;

	return distanceFromProbe <= probeZ;
}

void getInterpolationMask(vec3 texcoord,vec3 p,inout bool[8] interpolationMask,vec3 n,vec3 viewDir) {
	for(int i = 0;i<8;i++) {
		interpolationMask[i] = isProbeVisible(p, texcoord,i,n);
		// interpolationMask[i] = true;
		// interpolationMask[i] = 0.09 < probeZ;
	}
}

void getInterpolatedLightProbe(vec3 texcoord, vec3 p,inout vec3[9] probeSH, vec3 n, vec3 viewDir ) {
	bool interpolationMask[8];
	getInterpolationMask(texcoord,p,interpolationMask,n,viewDir);

	float x = (texcoord.x - float(int(texcoord.x*lpvTextureWidth))/lpvTextureWidth) * lpvTextureWidth;
	float z = (texcoord.y - float(int(texcoord.y*lpvTextureDepth))/lpvTextureDepth) * lpvTextureDepth;
	float y = (texcoord.z - float(int(texcoord.z*lpvTextureHeight))/lpvTextureHeight) * lpvTextureHeight;

	vec3 inter0_1[9];
	getMaskedProbeInterpolation(0,1,interpolationMask[0],interpolationMask[1],x,texcoord,inter0_1);  
	vec3 inter3_2[9];
	getMaskedProbeInterpolation(3,2,interpolationMask[3],interpolationMask[2],x,texcoord,inter3_2);
	
	vec3 inter01_32[9];
	getProbeInterpolation(inter0_1,inter3_2,z,inter01_32);


	vec3 inter4_5[9];
	getMaskedProbeInterpolation(4,5,interpolationMask[4],interpolationMask[5],x,texcoord,inter4_5);  
	vec3 inter7_6[9];
	getMaskedProbeInterpolation(7,6,interpolationMask[7],interpolationMask[6],x,texcoord,inter7_6);

	vec3 inter45_76[9];
	getProbeInterpolation(inter4_5,inter7_6,z,inter45_76);

	getProbeInterpolation(inter01_32,inter45_76,y,probeSH);
	// getProbeSH(0,texcoord,probeSH);
}

vec3 getTrilinearWeight(vec3 alpha, ivec3 offset) {
	vec3 trilinear;
	
	if(offset.x == 1) {
		trilinear.x = alpha.x;
	} else {
		trilinear.x = 1.0 - alpha.x; 
	}

	if(offset.y == 1) {
		trilinear.y = alpha.y;
	} else {
		trilinear.y = 1.0 - alpha.y; 
	}

	if(offset.z == 1) {
		trilinear.z = alpha.z;
	} else {
		trilinear.z = 1.0 - alpha.z; 
	}

	return trilinear;
}

float getProbeWeight(vec3 texcoord, vec3 p,int i,vec3 alpha, vec3 n) {
	// 0 => (0,0,0), 1 = > (1,0,0), 2 => (0,0,1), 3 => (1,0,1), 
	// 4 => (0,1,0), 5 => (1,1,0), 6 => (0,1,1), 7 => (1,1,1)
	ivec3 offset = ivec3(i, i >> 2, i >> 1) & ivec3(1);

	vec3 trilinear = getTrilinearWeight(alpha,offset);
	float weight = 1.0;

	vec3 probePos = getIProbeWorldPosition(i,texcoord);
	vec3 probeToP = p - probePos + (n) * 0.05;

	vec2 zBuffer = getProbeZBuffer(normalize(probeToP),texcoord,i);

	float distanceToProbe = length(probeToP);
	
	if( distanceToProbe > zBuffer.x ) { // Obstruction
		// http://www.punkuser.net/vsm/vsm_paper.pdf; equation 5
		float chebyshevWeight = zBuffer.y / (zBuffer.y + square(max(distanceToProbe - zBuffer.x, 0.0)));

		chebyshevWeight = max(pow3(chebyshevWeight), 0.0);

		weight *= chebyshevWeight;
	} else {
		weight *= trilinear.x * trilinear.y * trilinear.z;
	}

	return max(0.00001,weight);
}

vec3 getWeightedIrradiance(vec3 texcoord, vec3 p, vec3 n) {
	vec3 sumIrradiance = vec3(0);
	float sumWeight = 0.0;

	float x = (texcoord.x - float(int(texcoord.x*lpvTextureWidth))/lpvTextureWidth) * lpvTextureWidth;
	float z = (texcoord.y - float(int(texcoord.y*lpvTextureDepth))/lpvTextureDepth) * lpvTextureDepth;
	float y = (texcoord.z - float(int(texcoord.z*lpvTextureHeight))/lpvTextureHeight) * lpvTextureHeight;

	// Weight on each axis depending on where the sampling point is in the box
	vec3 alpha = vec3(x,y,z);
	
	vec3[9] probeSH;
	for(int i = 0;i<8;++i) {
		float weight = getProbeWeight(texcoord,p,i,alpha,n);
		// float weight = x+z+y;

		getProbeSH(i,texcoord,probeSH);

		sumIrradiance += weight * getLightProbeIrradiance(probeSH,n);
		sumWeight += weight;
	}

	return sumIrradiance / sumWeight;
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
	
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	
	vec3 texcoord = vec3(
		(2.0*((wPosition.x-lpvCenter.x) / lpvWidth) + 1.) / 2.,
		(2.0*((wPosition.z-lpvCenter.z) / lpvDepth) + 1.) / 2.,
		(2.0*((wPosition.y-lpvCenter.y) / lpvHeight) + 1.) / 2.
		);
		
	// vec3 interpolatedLightProbe[9];
	// getInterpolatedLightProbe(texcoord,wPosition.xyz,interpolatedLightProbe,worldNormal,geometryViewDir);
		
	
	// vec3 interpolatedLightProbe[9] = vec3[9]( texture(sh0,texcoord).rgb,
	// texture(sh1,texcoord).rgb,
	// texture(sh2,texcoord).rgb,
	// texture(sh3,texcoord).rgb,
	// texture(sh4,texcoord).rgb,
	// texture(sh5,texcoord).rgb,
	// texture(sh6,texcoord).rgb,
	// texture(sh7,texcoord).rgb,
	// texture(sh8,texcoord).rgb
	// );
	// vec3 color = getLightProbeIrradiance(interpolatedLightProbe,normal);
	
	vec3 color = getWeightedIrradiance(texcoord,wPosition.xyz,worldNormal);
	IncidentLight il = IncidentLight(color,normal,true);
	
	RE_Direct( il, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	
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

	// vec3 c;
	// if(isProbeVisible(wPosition.xyz,texcoord,7,worldNormal,geometryViewDir)) {
	// 	c = vec3(1,0,0);
	// } else {
	// 	c = vec3(0,0,0); 
	// }
	// outgoingLight = c;

		

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
	depthMapTexture;
	lpvParameters;
	atlasParameters;

    constructor() {
        this.#meshes = shallowReactive([]);
		this.textureLoader = new THREE.TextureLoader();

		this.shTextures = [];
		this.depthMapTexture = [];
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

		fetch(BASE_URL+'textures/depthMapAtlas.csv')
		.then((res) => res.text())
		.then((text) => {
			const values = text.split(',').map(Number);
			
			this.depthMapTexture = new Float32Array(values);
		})
		.catch((e) => console.error(e));
		
		fetch(BASE_URL+"textures/atlasParameters.json")
		.then((res) => res.json())
		.then((json) => {
			this.atlasParameters = json;
		})
		.catch((e) => console.error(e));
    }
	
    getMeshes = computed(()=>{
		return this.#meshes;
    });
	
    addSubMesh(scene,mesh,meshData) {
		let textSize = 0;
		
		mesh.material.customProgramCacheKey = () => {
			mesh.material.needsUpdate = true;


			if(this.lpvParameters && this.atlasParameters) {
				textSize = this.atlasParameters.width * 
							this.atlasParameters.depth *
							this.lpvParameters.height*this.lpvParameters.density;
			}
			
			return this.lpvParameters && this.shTextures.length == 9 && this.atlasParameters && this.depthMapTexture.length == textSize*2 ? '1' : '0';
		}
        
        mesh.material.onBeforeCompile = (shader) => {
			
			if(this.lpvParameters && this.shTextures.length == 9 
				&& this.atlasParameters && this.depthMapTexture.length  == textSize*2) {
				shader.vertexShader = vertexShader;
				shader.fragmentShader = fragShader;
				
				for(let i = 0;i<9;i++) {
					const sh3DTexture = new THREE.Data3DTexture(this.shTextures[i], 
																this.lpvParameters.width*this.lpvParameters.density,
																this.lpvParameters.depth*this.lpvParameters.density,
																this.lpvParameters.height*this.lpvParameters.density);
					sh3DTexture.magFilter = THREE.NearestFilter;
					sh3DTexture.minFilter = THREE.NearestFilter;
					sh3DTexture.type = THREE.FloatType;
					sh3DTexture.wrapS = THREE.ClampToEdgeWrapping
					sh3DTexture.wrapT = THREE.ClampToEdgeWrapping
					sh3DTexture.wrapR = THREE.ClampToEdgeWrapping
					sh3DTexture.needsUpdate = true;
					
					shader.uniforms["sh"+i] = {value: sh3DTexture};
				}
				
				const atlasTexture = new THREE.Data3DTexture(this.depthMapTexture, 
					this.atlasParameters.width,
					this.atlasParameters.depth,
					(this.lpvParameters.height*this.lpvParameters.density));
				atlasTexture.format = THREE.RGFormat;
				atlasTexture.magFilter = THREE.LinearFilter;
				atlasTexture.minFilter = THREE.LinearFilter;
				atlasTexture.type = THREE.FloatType;
				atlasTexture.wrapS = THREE.ClampToEdgeWrapping
				atlasTexture.wrapT = THREE.ClampToEdgeWrapping
				atlasTexture.wrapR = THREE.ClampToEdgeWrapping
				atlasTexture.needsUpdate = true;
				
				shader.uniforms.depthMapAtlas = {value: atlasTexture};



				shader.uniforms.lpvCenter = {value : new THREE.Vector3(this.lpvParameters.center.x,this.lpvParameters.center.y,this.lpvParameters.center.z)};
				shader.uniforms.lpvWidth = {value : this.lpvParameters.width};
				shader.uniforms.lpvDepth = {value : this.lpvParameters.depth};
				shader.uniforms.lpvHeight = {value : this.lpvParameters.height};
				shader.uniforms.lpvTextureWidth = {value : this.lpvParameters.width*this.lpvParameters.density};
				shader.uniforms.lpvTextureDepth = {value : this.lpvParameters.depth*this.lpvParameters.density};
				shader.uniforms.lpvTextureHeight = {value : this.lpvParameters.height*this.lpvParameters.density};
				shader.uniforms.lpvDensity = {value : this.lpvParameters.density};


				shader.uniforms.atlasFreqX = { value : (1.0/this.atlasParameters.width)};
				shader.uniforms.atlasFreqZ = { value : (1.0/this.atlasParameters.depth)};

				shader.uniforms.depthMapHalfSizeX = { value : (this.atlasParameters.depthMapSize/2.0)*(1.0/this.atlasParameters.width)};
				shader.uniforms.depthMapHalfSizeZ = { value : (this.atlasParameters.depthMapSize/2.0)*(1.0/this.atlasParameters.depth)};

				shader.uniforms.depthMapSize = { value : this.atlasParameters.depthMapSize };
				shader.uniforms.halfDepthMapSize = { value : this.atlasParameters.depthMapSize/2.0 };

				
				
				
				shader.uniforms.freqX = {value:1.0/(this.lpvParameters.width*this.lpvParameters.density)};
				shader.uniforms.freqY = {value:1.0/(this.lpvParameters.height*this.lpvParameters.density)};
				shader.uniforms.freqZ = {value:1.0/(this.lpvParameters.depth*this.lpvParameters.density)};
				shader.uniforms.worldFreq = {value:1.0/this.lpvParameters.density};
				
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