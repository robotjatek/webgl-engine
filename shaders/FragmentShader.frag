precision mediump float;

varying highp vec2 v_texture_coordinate;
uniform sampler2D u_sampler;

void main()
{
    vec4 texColor = texture2D(u_sampler, v_texture_coordinate);
    gl_FragColor = texColor;
}