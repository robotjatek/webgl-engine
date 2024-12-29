import { Texture } from './Texture';
import { gl } from './WebGLUtils';
import { IDisposable } from './IDisposable';

export class RenderTarget implements IDisposable {

    private readonly _framebufferId: WebGLFramebuffer;

    public constructor(private _texture: Texture) {
        const id = gl.createFramebuffer();
        if (!id) {
            throw new Error('Could not create framebuffer');
        }

        this._framebufferId = id;
        gl.bindFramebuffer(gl.FRAMEBUFFER, id);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, _texture.GetTexture(), 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Error while creating framebuffer");
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    public Render(renderCode: () => void): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebufferId);
        gl.viewport(0, 0, this._texture.Width, this._texture.Height);
        renderCode();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    public get Texture(): Texture {
        return this._texture;
    }

    public Dispose(): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(this._framebufferId);
    }
}