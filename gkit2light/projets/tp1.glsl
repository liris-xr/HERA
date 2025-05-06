
#version 430


#ifdef VERTEX_SHADER

uniform mat4 mvpMatrix;
uniform mat4 mvMatrix;
uniform mat4 mvMatrixInv;
layout(location= 0) in vec3 vertexPosition;
layout(location=1) in vec2 texcoord;
layout(location = 2) in vec3 vertexNormal;
out vec3 position;
out vec3 normal;
out vec3 origin;
out vec2 texC;
void main( )
{
    texC = texcoord;
    gl_Position= mvpMatrix * vec4(vertexPosition, 1);
    position = vertexPosition;
    normal = vertexNormal;
    origin = mvMatrixInv[3].xyz;
}
#endif

#ifdef FRAGMENT_SHADER

struct Material
{
    vec4 dc;              
    vec4 sc;
    vec4 ec;
    float ns;
    float ni;
    vec4 transmission;
    
    int diffuse_texture;
    int specular_texture;
    int ns_texture;
    
};

in vec3 position;
in vec3 normal;
in vec3 origin;
uniform vec3 light;
uniform sampler2D texture0;
in vec2 texC;
out vec4 fragment_color;
//Material
layout(std430, binding = 0) readonly buffer mmap
{
    Material materials[];
};
layout(std430, binding = 1) readonly buffer imap
{
    int indices[];
};

void main( )
{
    vec4 diffuse = texture(texture0, texC);

    vec4 specular = materials[indices[gl_PrimitiveID]].sc;
    float specCoef = materials[indices[gl_PrimitiveID]].ns;

    vec3 lightd = normalize(position-light);

    vec3 h = normalize(normalize(origin - position) + lightd);
    float cosTheta = dot(h,normal);

    fragment_color = (diffuse * max(dot(lightd,normal),0)) 
                    + ( specular * ((specCoef + 8)/(8*3.14159)) *  pow(cosTheta,specCoef));
}
#endif
