
export let gl: WebGL2RenderingContext;

export class WebGLUtils
{
    public static CreateGLRenderingContext(canvas: HTMLCanvasElement)
    {
        gl = canvas.getContext("webgl2");
    }
}
