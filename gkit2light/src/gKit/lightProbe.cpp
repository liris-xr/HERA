#include "lightProbe.hpp"

LightProbe::LightProbe(Point pos,unsigned int id) {
    this->position = pos;
    this->id = id;
}

float * getBasis(Vector direction) {
    float * shBasis = new float[9];

    // direction is assumed to be unit length
    float x = direction.x, y = direction.y, z = direction.z;

    // band 0
    shBasis[ 0 ] = 0.282095;

    // band 1
    shBasis[ 1 ] = 0.488603 * y;
    shBasis[ 2 ] = 0.488603 * z;
    shBasis[ 3 ] = 0.488603 * x;

    // band 2
    shBasis[ 4 ] = 1.092548 * x * y;
    shBasis[ 5 ] = 1.092548 * y * z;
    shBasis[ 6 ] = 0.315392 * ( 3 * z * z - 1 );
    shBasis[ 7 ] = 1.092548 * x * z;
    shBasis[ 8 ] = 0.546274 * ( x * x - y * y );

    return shBasis;
}

void LightProbe::add(const LightProbe & lp) {
    for ( int i = 0; i < 9; i ++ ) {
        this->coefficients[ i ] = this->coefficients[ i ] + lp.coefficients[ i ];
    }
}

void LightProbe::addScaled(const LightProbe & lp,const float s) {
    for ( int i = 0; i < 9; i ++ ) {
        this->coefficients[ i ] = this->coefficients[ i ] + (lp.coefficients[ i ]*s);
    }
}