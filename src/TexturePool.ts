import { Texture } from "./Texture";

export class TexturePool {

    public static GetInstance(): TexturePool {
        if (!this.Instance) {
            this.Instance = new TexturePool();
        }

        return this.Instance;
    }

    private static Instance: TexturePool;
    private textures = new Map<string, Texture>();

    public GetTexture(path: string): Texture {
        const texture = this.textures.get(path);
        if (!texture) {
            const created = new Texture(path);
            this.textures.set(path, created);
            return created;
        }
        return texture;
    }

    public ClearPool(): void {
        this.textures.forEach((value) => {
            value.Delete();
        });
        this.textures.clear();
    }

    // TODO: preload parameter
    public Preload(): void {
        this.GetTexture('Sword1.png');
        this.GetTexture('coin.png');
        this.GetTexture('monster1.png');
        this.GetTexture('hero1.png');
        this.GetTexture('ground0.png');
        this.GetTexture('exit.png');
    }

    /**
     * Empties the texture cache AND frees any OpenGL resources
     */
    public UnloadAll(): void {
        for (const [_, texture] of this.textures) {
            texture.Delete();
        }

        this.textures.clear();
    }
}
