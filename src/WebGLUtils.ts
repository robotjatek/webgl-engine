export let gl: WebGLRenderingContext;

export class WebGLUtils
{
    public static CreateGLRenderingContext(canvas: HTMLCanvasElement)
    {
        gl = canvas.getContext("webgl2");
    }
}
