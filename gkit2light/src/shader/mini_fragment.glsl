#version 330

uniform vec3 color;

uniform sampler2D image;

in vec2 vertex_texcoord;
out vec4 fragment_color;

void main( )
{
    vec4 tex= texture(image, vertex_texcoord);
    fragment_color= vec4(color * tex.rgb, 1.0);   // couleur opaque
}
