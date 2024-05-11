export class ShaderPool {
    private constructor() { }

    private static instance: ShaderPool;
    private shaderSources = new Map<string, string>();

    public static GetInstance(): ShaderPool {
        if (!this.instance) {
            this.instance = new ShaderPool();
        }
        return this.instance;
    }

    public async LoadShaderSource(path: string): Promise<string> {
        const source = this.shaderSources.get(path);
        if (!source) {
            const loaded = await this.GetSourceFromUrl(path)
            this.shaderSources.set(path, loaded);
            return loaded;
        }

        return source;
    }

    private async GetSourceFromUrl(url: string): Promise<string> {
        return await (await fetch(url)).text();
    }
}