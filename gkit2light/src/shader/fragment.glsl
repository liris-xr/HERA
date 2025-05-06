
#version 330

in vec3 vertex_position;

#ifdef USE_TEXCOORD
    in vec2 vertex_texcoord;
    uniform sampler2D diffuse_color;
#endif

#ifdef USE_NORMAL
    in vec3 vertex_normal;
#endif

#ifdef USE_COLOR
    in vec3 vertex_color;
#endif

out vec4 fragment_color;

void main( )
{
    vec3 color= vec3(1, 1, 1);
#ifdef USE_COLOR
    color= vertex_color;
#endif

#ifdef USE_TEXCOORD
    color= color * texture(diffuse_color, vertex_texcoord).rgb;
#endif
    
    vec3 normal;
#ifdef USE_NORMAL
    normal= vertex_normal;
#else
    vec3 t= normalize(dFdx(vertex_position));
    vec3 b= normalize(dFdy(vertex_position));
    normal= normalize(cross(t, b));
#endif
    
    color= color * normal.z;
    
    fragment_color= vec4(color, 1);
}
