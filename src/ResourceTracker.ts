import { Shader } from './Shader';
import { Texture } from './Texture';
import { SpriteBatch } from './SpriteBatch';

export class ResourceTracker {
    private static instance: ResourceTracker | null = null;

    public static GetInstance(): ResourceTracker {
        if (!this.instance) {
            this.instance = new ResourceTracker();
        }

        return this.instance;
    }

    private _tracking = false;
    private _shaders: Map<Shader, string> = new Map<Shader, string>();
    private _textures: Map<Texture, string> = new Map<Texture, string>();
    private _batches: Map<SpriteBatch, string> = new Map<SpriteBatch, string>();

    public StartTracking(): void {
        this._tracking = true;
    }

    public StopTracking(): void {
        this._tracking = false;
    }

    public TrackShader(shader: Shader): void {
        if (!this._tracking) {
            return;
        }

        this._shaders.set(shader, new Error().stack!);
    }

    public UnTrackShader(shader: Shader): void {
        if (!this._tracking) {
            return;
        }

        this._shaders.delete(shader);
    }

    public TrackTexture(texture: Texture): void {
        if (!this._tracking) {
            return;
        }

        this._textures.set(texture, new Error().stack!);
    }

    public UnTrackTexture(texture: Texture): void {
        if (!this._tracking) {
            return;
        }

        this._textures.delete(texture);
    }

    public get AliveShaderNumber(): number {
        return this._shaders.size;
    }

    public get AliveTextureNumber(): number {
        return  this._textures.size;
    }

    public get AliveShaderStackTrace(): string[] {
        const aliveShadersStackTrace: string[] = [];
        this._shaders.forEach(shader => {
            aliveShadersStackTrace.push(shader);
        })
        return aliveShadersStackTrace
    }

    public get AliveTextureStackTrace(): string[] {
        const aliveTextureStackTrace: string[] = [];
        this._textures.forEach(texture => {
            aliveTextureStackTrace.push(texture);
        });
        return aliveTextureStackTrace;
    }

    public get AliveResourceStackTrace(): string[] {
        const shaderStackTrace = this.AliveShaderStackTrace;
        const textureStacktrace = this.AliveTextureStackTrace;
        return textureStacktrace.concat(shaderStackTrace);
    }
}