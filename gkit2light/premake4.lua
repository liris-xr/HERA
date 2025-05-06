solution "gKit2light"
    configurations { "debug", "release" }

    includedirs { ".", "src/gKit" }
    
    gkit_dir = path.getabsolute(".")
    
    configuration "debug"
        targetdir "bin/debug"
        defines { "DEBUG" }
        if _PREMAKE_VERSION >="5.0" then
            symbols "on"
            cppdialect "c++11"
        else
            buildoptions { "-std=c++11" }
            flags { "Symbols" }
        end
    
    configuration "release"
        targetdir "bin/release"
--~ 		defines { "NDEBUG" }
--~ 		defines { "GK_RELEASE" }
        if _PREMAKE_VERSION >="5.0" then
            optimize "full"
            cppdialect "c++11"
        else
            buildoptions { "-std=c++11" }
            flags { "OptimizeSpeed" }
        end
        
    configuration "linux"
        buildoptions { "-mtune=native -march=native" }
        buildoptions { "-W -Wall -Wextra -Wsign-compare -Wno-unused-parameter -Wno-unused-function -Wno-unused-variable", "-pipe" }
        links { "GLEW", "SDL2", "SDL2_image", "GL" }
    
    configuration { "linux", "debug" }
        buildoptions { "-g"}
        linkoptions { "-g"}
    
    configuration { "linux", "release" }
        buildoptions { "-fopenmp" }
        linkoptions { "-fopenmp" }
        buildoptions { "-flto"}
        linkoptions { "-flto=auto"}
    
if _PREMAKE_VERSION >="5.0" then
    configuration { "windows", "codeblocks" }
        location "build"
        debugdir "."
        
        buildoptions { "-U__STRICT_ANSI__"} -- pour definir M_PI
        defines { "WIN32", "_WIN32" }
        includedirs { "extern/mingw/include" }
        libdirs { "extern/mingw/lib" }
        links { "mingw32", "SDL2main", "SDL2", "SDL2_image", "opengl32", "glew32" }
end
    
if _PREMAKE_VERSION >="5.0" then
    configuration { "windows" }
        defines { "WIN32", "_USE_MATH_DEFINES", "_CRT_SECURE_NO_WARNINGS" }
        defines { "NOMINMAX" } -- allow std::min() and std::max() in vc++ :(((

    configuration { "windows", "vs*" }
        location "build"
        debugdir "."
        
        system "Windows"
        architecture "x64"
        disablewarnings { "4244", "4305" }
        flags { "MultiProcessorCompile", "NoMinimalRebuild" }
        
        includedirs { "extern/visual/include" }
        libdirs { "extern/visual/lib" }
        links { "opengl32", "glew32", "SDL2", "SDL2main", "SDL2_image" }
end
    
    configuration "macosx"
        frameworks= "-F /Library/Frameworks/"
        buildoptions { "-std=c++17 -Wno-deprecated-declarations" }
        defines { "GK_MACOS" }
        buildoptions { frameworks }
        linkoptions { frameworks .. " -framework OpenGL -framework SDL2 -framework SDL2_image" }
    
 -- description des fichiers communs
gkit_files = { gkit_dir .. "/src/gKit/*.cpp", gkit_dir .. "/src/gKit/*.h" }


-- quand ce premake4.lua est inclus par un autre premake qui definit no_project=true (donc quand gkit2light est utilisé comme une lib),
-- ceci stoppe la creation des projects suivants (tuto, etc.)
if no_project then
    do return end
end

 -- description des projets		 
projects = {
    "base",
    "ray",
    "cg"
}

for i, name in ipairs(projects) do
    project(name)
        language "C++"
        kind "ConsoleApp"
        targetdir "bin"
        files ( gkit_files )
        files { gkit_dir .. "/projets/" .. name..'.cpp' }
end

 -- description des utilitaires
tools= {
    "shader_kit",
    "shader_kit_debug",
    "image_viewer"
}

for i, name in ipairs(tools) do
    project(name)
        language "C++"
        kind "ConsoleApp"
        targetdir "bin"
        files ( gkit_files )
        files { gkit_dir .. "/src/" .. name..'.cpp' }
end

 -- description des tutos
tutos = {
    "tuto1",
    "tuto2",
    "tuto3",
    "tuto4",
    "tuto5",
    "tuto6",
    
    "tuto7",
    "tuto7_camera",
    "tuto_transformations",
    "tuto_transformations_camera",
    "tuto_transformations_lookat",
    "tuto_decal",
    "tuto_shadows",
    "tuto_deferred_decal",

    "tuto8",
    "tuto9",
    "tuto9_materials",
    "tuto9_groups",
    "tuto9_texture1",
    "tuto9_textures",
    "tuto9_buffers",
    "tuto10",
    
--~     "tuto_transform",
    "tuto_pad",
    
    "tuto1GL",
    "tuto2GL",
    "tuto2GL_app",
    "tuto3GL",
    "tuto3GL_reflect",
    "tuto4GL",
    "tuto4GL_normals",
    "tuto5GL",
    "tuto5GL_sampler",
    "tuto5GL_samplers",
    "tuto5GL_multi",
    "tuto_draw_cubemap",
    "tuto_cubemap",
    "tuto_dynamic_cubemap",
    
    "tuto6GL",
    "tuto6GL_buffer",
    "tuto_framebuffer",
    "tuto_uniform_buffers",
    "tuto_storage",
    "tuto_storage_buffer",
    "tuto_storage_texture",
    "min_data",
    "tuto_vertex_compute",
    
    "tuto_rayons",
    "tuto_englobant",
    "tuto_bvh",
    "tuto_bvh2",
    "tuto_bvh2_gltf",
    "tuto_bvh2_gltf_brdf",
    "tuto_ray_gltf",
    
}

for i, name in ipairs(tutos) do
    project(name)
        language "C++"
        kind "ConsoleApp"
        targetdir "bin"
        files ( gkit_files )
        files { gkit_dir .. "/tutos/" .. name..'.cpp' }
end

--~ project("mesh_viewer")
--~     language "C++"
--~     kind "ConsoleApp"
--~     targetdir "bin"
--~     files ( gkit_files )
--~     files { gkit_dir .. "/tutos/mesh_viewer.cpp"}
--~     files { gkit_dir .. "/tutos/mesh_buffer.cpp"}
--~     files { gkit_dir .. "/tutos/mesh_buffer.h"}
--~     files { gkit_dir .. "/tutos/mesh_data.cpp"}
--~     files { gkit_dir .. "/tutos/mesh_data.h"}
--~     files { gkit_dir .. "/tutos/material_data.cpp"}
--~     files { gkit_dir .. "/tutos/material_data.h"}


-- description des tutos openGL avances / M2
tutosM2 = {
    "tuto_time",
    "tuto_mdi",
    "tuto_mdi_elements",
    "tuto_mdi_elements_count",
    "tuto_mdi_count",
    "tuto_stream",

    "tuto_is",
    "tuto_raytrace_fragment",
    "tuto_raytrace_compute",
    "tuto_histogram1_compute",
    "tuto_histogram2_compute",
    "tuto_histogram_compute",
    "tuto_read_buffer",
    "tuto_count_buffer",
	"tuto_compute_buffer",
	"tuto_compute_image",
}

for i, name in ipairs(tutosM2) do
    project(name)
        language "C++"
        kind "ConsoleApp"
        targetdir "bin"
        files ( gkit_files )
        files { gkit_dir .. "/tutos/M2/" .. name..'.cpp' }
end


project("benchv3")
	language "C++"
	kind "ConsoleApp"
	targetdir "bin"
	files ( gkit_files )
	files { gkit_dir .. "/tutos/bench/benchv3.cpp" }


project("gltf")
	language "C++"
	kind "ConsoleApp"
	targetdir "bin"
	files ( gkit_files )
	files { gkit_dir .. "/tutos/gltf/viewer.cpp" }

project("simple_gltf")
	language "C++"
	kind "ConsoleApp"
	targetdir "bin"
	files ( gkit_files )
	files { gkit_dir .. "/tutos/gltf/simple.cpp" }

