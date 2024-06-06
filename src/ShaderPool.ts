import { Lock } from './Lock';

export class ShaderPool {
    private constructor() { }

    private static instance: ShaderPool;
    private shaderSources = new Map<string, string>();
    private lock = new Lock();

    public static GetInstance(): ShaderPool {
        if (!this.instance) {
            this.instance = new ShaderPool();
        }
        return this.instance;
    }

    public async LoadShaderSource(path: string): Promise<string> {
        await this.lock.lock();
        const source = this.shaderSources.get(path);
        if (!source) {
            const loaded = await this.GetSourceFromUrl(path)
            this.shaderSources.set(path, loaded);
            await this.lock.release();
            return loaded;
        }

        await this.lock.release();
        return source;
    }

    private async GetSourceFromUrl(url: string): Promise<string> {
        return await (await fetch(url)).text();
    }
}