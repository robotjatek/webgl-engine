
export let gl: WebGL2RenderingContext;

export class WebGLUtils {
    public static CreateGLRenderingContext(canvas: HTMLCanvasElement): void {
        gl = canvas.getContext('webgl2')!;
        if (!gl) {
            throw new Error('Failed to create rendering context');
        }
    }
}
