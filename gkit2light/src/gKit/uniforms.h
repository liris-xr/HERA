
#ifndef _UNIFORMS_H
#define _UNIFORMS_H

#include <string>
#include <vector>

#include "glcore.h"

#include "vec.h"
#include "mat.h"
#include "color.h"


//! \addtogroup openGL utilitaires openGL
///@{

//! \file 
//! utilitaires uniforms.

//! affecte une valeur a un uniform du shader program. uint.
void program_uniform( const GLuint program, const char *uniform, const unsigned v );
//! affecte une valeur a un uniform du shader program. int.
void program_uniform( const GLuint program, const char *uniform, const int v );
//! affecte une valeur a un uniform du shader program. float.
void program_uniform( const GLuint program, const char *uniform, const float v );

//! affecte une valeur a un uniform du shader program. vec2.
void program_uniform( const GLuint program, const char *uniform, const vec2& v );

//! affecte une valeur a un uniform du shader program. vec3.
void program_uniform( const GLuint program, const char *uniform, const vec3& v );
//! affecte une valeur a un uniform du shader program. Point.
void program_uniform( const GLuint program, const char *uniform, const Point& v );
//! affecte une valeur a un uniform du shader program. Vector.
void program_uniform( const GLuint program, const char *uniform, const Vector& v );

//! affecte une valeur a un uniform du shader program. vec4.
void program_uniform( const GLuint program, const char *uniform, const vec4& v );
//! affecte une valeur a un uniform du shader program. Color.
void program_uniform( const GLuint program, const char *uniform, const Color& c );

//! affecte une valeur a un uniform du shader program. Transform.
void program_uniform( const GLuint program, const char *uniform, const Transform& v );

//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<unsigned>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<int>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<float>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<vec2>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<vec3>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<vec4>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<Color>& c );
//! affecte un tableau de valeurs a un uniform du shader program. 
void program_uniform( const GLuint program, const char *uniform, const std::vector<Transform>& v );

//! configure le pipeline et le shader program pour utiliser une texture, et des parametres de filtrage, eventuellement.
void program_use_texture( const GLuint program, const char *uniform, const int unit, const GLuint texture, const GLuint sampler= 0 );

///@}
#endif
