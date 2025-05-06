
#ifndef _OBJ_FAST_H
#define _OBJ_FAST_H

#include "mesh.h"


//! \addtogroup objet3D
///@{

//! \file 
//! charge un fichier wavefront .obj et construit un mesh. version rapide, mais pas robuste aux erreurs.

//! charge un fichier wavefront .obj et renvoie un mesh compose de triangles non indexes. utiliser glDrawArrays pour l'afficher. a detruire avec Mesh::release( ).
Mesh read_mesh_fast( const char *filename );

//! charge un fichier wavefront .obj et renvoie un mesh compose de triangles indexes. utiliser glDrawElements pour l'afficher. a detruire avec Mesh::release( ).
Mesh read_indexed_mesh_fast( const char *filename );

///@}
#endif
