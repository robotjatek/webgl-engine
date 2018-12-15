import { gl } from "./WebGLUtils";

export class Texture
{
    private static readonly TexturesFolder = "textures/";
    private texture: WebGLTexture;

    constructor(path: string)
    {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 0, 255]));

        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
        };

        image.src = Texture.TexturesFolder + path;
    }

    public GetTexture()
    {
        return this.texture;
    }
}
