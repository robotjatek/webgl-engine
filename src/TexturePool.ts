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

    public async GetTexture(path: string): Promise<Texture> {
        const texture = this.textures.get(path);
        if (!texture) {
            const created = await Texture.Create(path);
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
    // TODO: file loading itself is case insensitive, but the cache is not -- not entirely true: web server dependent
    public async Preload(): Promise<void> {
        await Promise.all([
            this.GetTexture('textures/Sword1.png'),
            this.GetTexture('textures/coin.png'),
            this.GetTexture('textures/monster1.png'),
            this.GetTexture('textures/Monster2.png'),
            this.GetTexture('textures/hero1.png'),
            this.GetTexture('textures/ground0.png'),
            this.GetTexture('textures/exit.png'),
            this.GetTexture('textures/fireball.png'),
            this.GetTexture('textures/fang.png'),
            this.GetTexture('textures/bg.jpg'),
            this.GetTexture('textures/spike.png'),
            this.GetTexture('textures/cactus1.png'),
            this.GetTexture('textures/potion.png')
        ]);
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
