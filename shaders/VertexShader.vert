attribute vec3 a_pos;
uniform mat4 projection;
uniform mat4 view;

void main()
{
    gl_Position = projection * view * vec4(a_pos,1);
}