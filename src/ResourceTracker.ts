import { Shader } from './Shader';
import { Texture } from './Texture';
import { SpriteBatch } from './SpriteBatch';
import { Environment } from './Environment';

export class ResourceTracker {
    private static instance: ResourceTracker | null = null;

    public static GetInstance(): ResourceTracker {
        if (!this.instance) {
            this.instance = new ResourceTracker();
        }

        return this.instance;
    }

    private _tracking = Environment.TrackResources;
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

    public TrackSpriteBatch(batch: SpriteBatch): void {
        if (!this._tracking) {
            return;
        }
        this._batches.set(batch, new Error().stack!);
    }

    public UnTrackSpriteBatch(batch: SpriteBatch): void {
        if (!this._tracking) {
            return;
        }
        this._batches.delete(batch);
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

    public get AliveSpriteBatchStackTrace(): string[] {
        const aliveSpriteBatchStackTrace: string[] = [];
        this._batches.forEach(batch => {
            aliveSpriteBatchStackTrace.push(batch);
        });
        return aliveSpriteBatchStackTrace;
    }

    public get AliveResourceStackTrace(): string[] {
        return this.AliveTextureStackTrace
            .concat(this.AliveShaderStackTrace)
            .concat(this.AliveSpriteBatchStackTrace);
    }
}