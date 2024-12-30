import { Lock } from './Lock';
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
    private lock: Lock = new Lock();

    public async GetTexture(path: string): Promise<Texture> {
        await this.lock.lock(path);
        const texture = this.textures.get(path);
        if (!texture) {
            const created = await Texture.Create(path);
            this.textures.set(path, created);
            await this.lock.release(path);
            return created;
        }
        await this.lock.release(path);

        return texture;
    }

    /**
     * Empties the texture cache AND frees any OpenGL resources
     */
    public ClearPool(): void {
        this.textures.forEach((value) => {
            value.Delete();
        });
        this.textures.clear();
    }

    // TODO: preload parameter
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
            this.GetTexture('textures/potion.png'),
            this.GetTexture('textures/title.jpeg'),
            this.GetTexture('textures/firebomb.png')
        ]);
    }

    public RemoveAllIn(paths: string[]): void {
        paths.forEach(path => {
            const texture = this.textures.get(path);
            if (texture) {
                this.textures.delete(path);
                texture.Delete();
            }
        });
    }

}
