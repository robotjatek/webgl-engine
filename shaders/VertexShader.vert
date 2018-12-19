#version 300 es

in vec3 a_pos;
in vec2 a_texture_coordinate;
uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

out highp vec2 v_texture_coordinate;

void main()
{
    gl_Position = projection * view * model * vec4(a_pos,1);
    v_texture_coordinate = a_texture_coordinate;
}