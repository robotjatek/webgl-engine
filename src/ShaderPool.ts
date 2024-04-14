export class ShaderPool {
    private constructor() { }

    private static instance: ShaderPool;
    private shaders = new Map<string, string>();

    public static GetInstance(): ShaderPool {
        if (!this.instance) {
            this.instance = new ShaderPool();
        }
        return this.instance;
    }

    public LoadShaderSource(path: string): string {
        const source = this.shaders.get(path);
        if (!source) {
            const loaded = this.GetSourceFromUrl(path)
            this.shaders.set(path, loaded);
            return loaded;
        }

        return source;
    }

    // TODO: make this async
    private GetSourceFromUrl(url: string): string {
        const req = new XMLHttpRequest();
        req.open("GET", url, false);
        req.overrideMimeType("text/plain");
        req.send(null);
        return req.responseText;
    }
}