#version 300 es

precision mediump float;

uniform float CANVAS_SIZE_X;
uniform float CANVAS_SIZE_Y;
uniform float zoomfactor;
uniform float centerx;
uniform float centery;

void main()
{
    vec3 color;
    vec2 z, c;
	z.x = 0.0;
	z.y = 0.0;

	c.x = (gl_FragCoord.x / CANVAS_SIZE_X)*zoomfactor-centerx - 1.5;
	c.y = (gl_FragCoord.y / CANVAS_SIZE_Y)*zoomfactor-centery - 0.5;

    int iterations = 0;
	for(int i = 0; i < 100; i++)
	{
		float x = z.x*z.x - z.y*z.y + c.x;
		float y = 2.0*(z.x*z.y) + c.y;
		z.x = x;
		z.y = y;
        iterations++;

		if(((z.x*z.x+z.y*z.y) >= 4.0))
		{
			break;
		}
	}

	if(iterations == 100)
    {
        color = vec3(0,0,0);
    }
    else
    {
	    color = vec3(0.0, 0.0, (float(iterations)/255.0)*(255.0/100.0));
    }
    gl_FragColor = vec4(color,1);
}