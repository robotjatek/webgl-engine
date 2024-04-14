#version 300 es
precision mediump float;

in highp vec2 v_texture_coordinate;
out vec4 color;
uniform sampler2D u_sampler;
uniform vec2 texOffset;
uniform vec4 colorOverlay;

void main() {
    vec4 texColor = texture(u_sampler, v_texture_coordinate + texOffset);
    color = texColor + colorOverlay;
}