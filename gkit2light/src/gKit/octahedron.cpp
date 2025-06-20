#include "octahedron.hpp"
#include "vec.h"
#include <map>

const Vector UP(0,1,0);
const Vector BACKWARD(0,0,-1);
const Vector FORWARD(0,0,1);
const Vector RIGHT(1,0,0);
const Vector LEFT(-1,0,0);
const Vector DOWN(0,-1,0);

Octahedron::Octahedron(unsigned int size) {
    this->size = size;
    this->halfSize = size/2;

    this->octahedronPoints = std::map<std::string, Vector>{
        {"A",Vector(0,0,0)},
        {"B",Vector(halfSize,0,0)},
        {"C",Vector(size,0,0)},

        {"D",Vector(0,halfSize,0)},
        {"E",Vector(halfSize,halfSize,0)},
        {"F",Vector(size,halfSize,0)},

        {"G",Vector(0,size,0)},
        {"H",Vector(halfSize,size,0)},
        {"I",Vector(size,size,0)},
    };

    this->triangleVectors = std::map<std::string, Vector>{
        {"right",Vector(halfSize,0,0)},
        {"up-left",Vector(-halfSize,halfSize,0)},
        {"down",Vector(0,-halfSize,0)},

        {"up",Vector(0,halfSize,0)},
        {"left",Vector(-halfSize,0,0)},
        {"down-right",Vector(halfSize,-halfSize,0)},

        {"down-left",Vector(-halfSize,-halfSize,0)},
        {"up-right",Vector(halfSize,halfSize,0)},
    };
}

Vector Octahedron::getVector(unsigned int i, unsigned int j) {
    Vector p(i,j,0);
    float a1, a2, a3;
    // Down Left Square
    if(i <halfSize && j < halfSize) {
        if((i+j) < halfSize) {
            // Interpolation between DOWN (down left corner), BACKWARD and LEFT
            a1 = std::abs(cross(p-octahedronPoints["A"],triangleVectors["right"]).z); // Left coef
            a2 = std::abs(cross(p-octahedronPoints["B"],triangleVectors["up-left"]).z); // Down coef
            a3 = std::abs(cross(p-octahedronPoints["D"],triangleVectors["down"]).z); // Backward coef

            Vector pb = p-octahedronPoints["B"];
            Vector ul = triangleVectors["up-left"];
    
            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;
            
            return normalize(LEFT*a1 + DOWN*a2 + BACKWARD*a3); 
        } else {
            // Interpolation between BACKWARD, UP and LEFT
            a1 = std::abs(cross(p-octahedronPoints["B"],triangleVectors["up"]).z); // Left coef
            a2 = std::abs(cross(p-octahedronPoints["E"],triangleVectors["left"]).z); // Backward coef
            a3 = std::abs(cross(p-octahedronPoints["D"],triangleVectors["down-right"]).z); // Up coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(LEFT*a1 + BACKWARD*a2 + UP*a3); 
        }
    }

    // Up Left Square
    if(i < halfSize && j >= halfSize) {
        if((j-i) >= halfSize) {
            // Interpolation between LEFT, FORWARD and DOWN
            a1 = cross(p-octahedronPoints["D"],triangleVectors["up-right"]).z; // Down coef
            a2 = cross(p-octahedronPoints["H"],triangleVectors["left"]).z; // Left coef
            a3 = cross(p-octahedronPoints["G"],triangleVectors["down"]).z; // Forward coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(DOWN*a1 + LEFT*a2 + FORWARD*a3); 
        } else {
            // Interpolation between UP, FORWARD and LEFT
            a1 = cross(p-octahedronPoints["D"],triangleVectors["right"]).z; // Forward coef
            a2 = cross(p-octahedronPoints["E"],triangleVectors["up"]).z; // Left coef
            a3 = cross(p-octahedronPoints["H"],triangleVectors["down-left"]).z; // Up coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(FORWARD*a1 + LEFT*a2 + UP*a3); 
        }
    }

    // Down right square
    if(i >= halfSize && j < halfSize) {
        if((i-j) >= halfSize) {
            // Interpolation between BACKWARD, DOWN and RIGHT
            a1 = cross(p-octahedronPoints["B"],triangleVectors["right"]).z; // Right coef
            a2 = cross(p-octahedronPoints["C"],triangleVectors["up"]).z; // Backward coef
            a3 = cross(p-octahedronPoints["F"],triangleVectors["down-left"]).z; // Down coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(RIGHT*a1 + BACKWARD*a2 + DOWN*a3); 
        } else {
            // Interpolation between BACKWARD, RIGHT and UP
            a1 = cross(p-octahedronPoints["B"],triangleVectors["up-right"]).z; // Up coef
            a2 = cross(p-octahedronPoints["F"],triangleVectors["left"]).z; // Backward coef
            a3 = cross(p-octahedronPoints["E"],triangleVectors["down"]).z; // Right coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(UP*a1 + BACKWARD*a2 + RIGHT*a3); 
        }
    }
    // Up right square
    if(i>=halfSize && j>=halfSize) {
        if((i+j) < halfSize*3) {
            // Interpolation between UP, RIGHT and FORWARD
            a1 = cross(p-octahedronPoints["E"],triangleVectors["right"]).z; // Forward coef
            a2 = cross(p-octahedronPoints["F"],triangleVectors["up-left"]).z; // Up coef
            a3 = cross(p-octahedronPoints["H"],triangleVectors["down"]).z; // Right coef
    
            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;
    
            return normalize(FORWARD*a1 + UP*a2 + RIGHT*a3); 
        } else {
            // Interpolation between DOWN, FORWARD, RIGHT
            a1 = cross(p-octahedronPoints["F"],triangleVectors["up"]).z; // Forward coef 
            a2 = cross(p-octahedronPoints["I"],triangleVectors["left"]).z; // Right coef
            a3 = cross(p-octahedronPoints["H"],triangleVectors["down-right"]).z; // Down coef

            float aTotal = a1 + a2 + a3;
            a1 /= aTotal;
            a2 /= aTotal;
            a3 /= aTotal;

            return normalize(FORWARD*a1 + RIGHT*a2 + DOWN*a3); 
        }
    }
}