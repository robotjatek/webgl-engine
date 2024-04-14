import { Texture } from "./Texture";

export class TexturePool {

    public static GetInstance(): TexturePool {
        if (!this.Instance) {
            this.Instance = new TexturePool();
        }

        return this.Instance;
    }

    private static Instance: TexturePool;
    private Textures = new Map<string, Texture>();

    public GetTexture(path: string): Texture {
        const texture = this.Textures.get(path);
        if (!texture) {
            const created = new Texture(path);
            this.Textures.set(path, created);
            return created;
        }
        return texture;
    }

    public ClearPool(): void {
        this.Textures.forEach((value) => {
            value.Delete();
        });
        this.Textures.clear();
    }
}
