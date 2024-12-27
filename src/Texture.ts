import { gl } from './WebGLUtils';

export class Texture {
    private readonly texture: WebGLTexture;
    private valid: boolean = false;
    private height!: number;
    private width!: number;

    private constructor() {
        this.texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    public static fromImage(image: ImageBitmap): Texture {
        const texture = new Texture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        texture.height = image.height;
        texture.width = image.width;
        gl.generateMipmap(gl.TEXTURE_2D);
        texture.valid = true;
        return texture;
    }

    public static empty(width: number, height: number): Texture {
        const texture = new Texture();
        // This is here only to make firefox shut up about a
        // "Error: WebGL warning: drawElements: Tex image TEXTURE_2D level 0 is incurring lazy initialization."
        // Which is a warning. glTexImage2D()'s last param should be null normally...
        const zeroData = new Uint8Array(new ArrayBuffer(width * height * 4));
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, zeroData);
        texture.width = width;
        texture.height = height;
        texture.valid = true;
        gl.generateMipmap(gl.TEXTURE_2D);
        return texture;
    }

    public static async Create(path: string): Promise<Texture> {
        const image = await this.LoadImage(path);
        return Texture.fromImage(image);
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
        return await createImageBitmap(blob);
    }
}
