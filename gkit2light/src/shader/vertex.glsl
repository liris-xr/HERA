
#version 330

layout(location= 0) in vec3 position;
out vec3 vertex_position;

#ifdef USE_TEXCOORD
    layout(location= 1) in vec2 texcoord;
    out vec2 vertex_texcoord;
#endif

#ifdef USE_NORMAL
    layout(location= 2) in vec3 normal;
    out vec3 vertex_normal;
#endif

#ifdef USE_COLOR
    layout(location= 3) in vec3 color;
    out vec3 vertex_color;
#endif

uniform mat4 mvpMatrix;
uniform mat4 mvMatrix;
uniform mat4 normalMatrix;

void main( )
{
    gl_Position= mvpMatrix * vec4(position, 1);
    vertex_position= vec3(mvMatrix * vec4(position, 1));
    
#ifdef USE_TEXCOORD
    vertex_texcoord= texcoord;
#endif
    
#ifdef USE_NORMAL
    vertex_normal= mat3(normalMatrix) * normal;
#endif
    
#ifdef USE_COLOR
    vertex_color= color;
#endif
}
