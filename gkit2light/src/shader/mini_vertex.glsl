#version 330

uniform mat4 mvpMatrix;

layout(location= 0) in vec3 position;
layout(location= 1) in vec2 texcoord;

out vec2 vertex_texcoord;

void main( )
{
    gl_Position= mvpMatrix * vec4(position, 1.0);
    vertex_texcoord= texcoord;
}
