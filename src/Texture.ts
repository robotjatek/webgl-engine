import { gl } from './WebGLUtils';

export class Texture {
    private texture: WebGLTexture;
    private valid: boolean;
    private height: number;
    private width: number;

    private constructor(image: ImageBitmap) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

        this.height = image.height;
        this.width = image.width;
        this.valid = true;
    }

    public static async Create(path: string): Promise<Texture> {
        const image = await this.LoadImage(path);
        return new Texture(image);
    }

    public GetTexture(): WebGLTexture {
        if (!this.valid) {
            throw new Error("Trying to get a deleted texture!");
        }
        return this.texture;
    }

    public Delete(): void {
        gl.deleteTexture(this.texture);
    }

    public get Width(): number {
        return this.width;
    }

    public get Height(): number {
        return this.height;
    }

    private static async LoadImage(path: string): Promise<ImageBitmap> {
        const blob = await (await fetch(path)).blob();
        const bitmap = await createImageBitmap(blob);

        return bitmap;
    }
}
