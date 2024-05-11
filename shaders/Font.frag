#version 300 es
precision mediump float;

in highp vec2 v_texture_coordinate;
in vec3 fVertexData;
out vec4 fragmentColor;

uniform sampler2D tex;
uniform float hue;
uniform float saturation;
uniform float value ;
const float gCutoff = 0.1;

//HSV to RGB: http://www.chilliant.com/rgb2hsv.html
#define saturate(x) clamp(x, 0., 1.)
vec3 hueToRgb(float h)
{
	float r = abs(h * 6.0f - 3.0f) - 1.f;
	float g = 2.0f - abs(h * 6.0f - 2.0f);
	float b = 2.0f - abs(h * 6.0f - 4.0f);

	return saturate(vec3(r,g,b));
}

vec3 hsvToRgb(float h, float s, float v)
{
	vec3 rgb = hueToRgb(h);
	return ((rgb - 1.0f) * s + 1.0f) * v;
}

float clip(float alpha, float cutoff)
{
	if(alpha < cutoff)
	{
		discard;
	}

	return alpha;
}

void main()
{
	float alpha = texture(tex, v_texture_coordinate).a;
	fragmentColor = vec4(hsvToRgb(hue, saturation, value), clip(alpha, gCutoff));
	// fragmentColor = vec4(1, 0, 0, 1);
}