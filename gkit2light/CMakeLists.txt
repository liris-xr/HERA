cmake_minimum_required(VERSION 3.10)

# set the project name
project(gkit2light)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED true)

# gkit files
file(GLOB gkit_files "src/gKit/*.cpp")

# add the executable
add_executable(tuto7_camera "tutos/tuto7_camera.cpp" ${gkit_files})
target_include_directories(tuto7_camera PUBLIC "src/gKit")
target_link_libraries(tuto7_camera GL GLEW SDL2 SDL2_image)
set_target_properties(tuto7_camera PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/bin")
set_target_properties(tuto7_camera PROPERTIES WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")
