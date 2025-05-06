
#version 330

#ifdef VERTEX_SHADER

out vec2 position;

void main( )
{
    vec2 positions[3]= vec2[3]( vec2(-1,-3), vec2(3, 1), vec2(-1, 1) );
    
    position= positions[gl_VertexID];
    gl_Position= vec4(positions[gl_VertexID], 0, 1);
}

#endif

#ifdef FRAGMENT_SHADER

/*
catalogue de fonctions :
http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
*/

float sphere( const vec3 p, const float radius )
{
    return length(p) - radius;
}

float rbox( vec3 p, vec3 b, float r )
{
  return length(max(abs(p) - b, 0.0)) - r;
}

float box( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d, 0.0));
}

float displace( const vec3 p )
{
    return sin(30 * p.x) * sin(30 * p.y) * sin(30 * p.z) * 0.04;
}

float object( const vec3 p )
{
    float d1= sphere(p, 0.75);
    //~ float d2= rbox(p, vec3(0.5, 0.5, 0.5), 0.1);
    float d2= box(p, vec3(0.6, 0.6, 0.6));
    //~ float d2= displace(p);
    //~ float d2= 0;
    
    return max(-d1,d2);
    //~ return d2;
}


uniform mat4 mvpInvMatrix;
uniform mat4 mvMatrix;

in vec2 position;

out vec4 fragment_color;

void main( )
{
    // construction du rayon pour le pixel
    vec4 oh= mvpInvMatrix * vec4(position, 0, 1);       // origine sur near
    vec4 eh= mvpInvMatrix * vec4(position, 1, 1);       // extremite sur far
    
    // origine et direction normalisee
    vec3 o= oh.xyz / oh.w;                              // origine
    vec3 d= normalize(eh.xyz / eh.w - oh.xyz / oh.w);   // direction
    
    float t= 0.0;
    float distance= 0.0;
    vec3 p;
    for(int i= 0; i < 128; i++)
    {
        p= o + t * d;
        
        distance= object(p);
        t= t + distance / 1.5;
    }
    
    vec4 q= mvMatrix * vec4(p, 1);
    q/= q.w;
    vec3 n= cross(normalize(dFdx(q.xyz)), normalize(dFdy(q.xyz)));
    fragment_color= vec4(abs(n.zzz), 1);
}

#endif
