
#include <cmath>
#include <algorithm>

#include "color.h"


float Color::power( ) const
{
    return (r+g+b) / 3;
}

float Color::max( ) const
{
    return std::max(r, std::max(g, std::max(b, float(0))));
}

Color linear( const Color& color )
{
    const float g= float(1 / 2.2);
    return Color(std::pow(color.r, g), std::pow(color.g, g), std::pow(color.b, g), color.a);
}

Color gamma( const Color& color )
{
    const float invg= float(2.2);
    return Color(std::pow(color.r, invg), std::pow(color.g, invg), std::pow(color.b, invg), color.a);
}


Color Black( )
{
    return Color(0, 0, 0);
}

Color White( )
{
    return Color(1, 1, 1);
}

Color Red( )
{
    return Color(1, 0, 0);
}

Color Green( )
{
    return Color(0, 1, 0);
}

Color Blue( )
{
    return Color(0, 0, 1);
}

Color Yellow( )
{
    return Color(1, 1, 0);
}


Color operator+ ( const Color& a, const Color& b )
{
    return Color(a.r + b.r, a.g + b.g, a.b + b.b, a.a + b.a);
}

Color operator- ( const Color& c )
{
    return Color(-c.r, -c.g, -c.b, -c.a);
}

Color operator- ( const Color& a, const Color& b )
{
    return a + (-b);
}

Color operator* ( const Color& a, const Color& b )
{
    return Color(a.r * b.r, a.g * b.g, a.b * b.b, a.a * b.a);
}

Color operator* ( const float k, const Color& c )
{
    return Color(c.r * k, c.g * k, c.b * k, c.a * k);
}

Color operator* ( const Color& c, const float k )
{
    return k * c;
}

Color operator/ ( const Color& a, const Color& b )
{
    return Color(a.r / b.r, a.g / b.g, a.b / b.b, a.a / b.a);
}

Color operator/ ( const float k, const Color& c )
{
    return Color(k / c.r, k / c.g, k / c.b, k / c.a);
}

Color operator/ ( const Color& c, const float k )
{
    float kk= 1 / k;
    return kk * c;
}
