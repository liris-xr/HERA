
#version 330

#ifdef VERTEX_SHADER
uniform mat4 mvpMatrix;

layout(location= 0) in vec3 vertexPosition;
layout(location= 1) in vec3 vertexNormal;
out vec3 position;
out vec3 normal;

void main( )
{
    vec4 pos4 = mvpMatrix * vec4(vertexPosition, 1);
    position = vec3(pos4.x,pos4.y,pos4.z);
    normal = vertexNormal;
    gl_Position = pos4; 
}

#endif


#ifdef FRAGMENT_SHADER
in vec3 position;
in vec3 normal;
layout(location= 0) out vec3 pos;
layout(location= 1) out vec3 norm;
layout(location= 2) out vec3 color;


out vec4 fragment_color;

void main( )
{
    pos = position;
    norm = normal;
    color = vec3(1, 0.4, 0);
    fragment_color = vec4(color,1);
}

#endif
