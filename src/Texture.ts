import { gl } from "./WebGLUtils";

export class Texture
{
    private static readonly TexturesFolder = "textures/";
    private texture: WebGLTexture;
    private valid: boolean;

    constructor(path: string)
    {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));

        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
        };

        image.src = Texture.TexturesFolder + path;
        this.valid = true;
    }

    public GetTexture(): WebGLTexture
    {
        if (!this.valid)
        {
            throw new Error("Trying to get a deleted texture!");
        }
        return this.texture;
    }

    public Delete(): void
    {
        gl.deleteTexture(this.texture);
    }
}
