import { FontConfig } from './Textbox';

export class FontConfigPool {
    private constructor() {}

    private static instance: FontConfigPool;
    private configs = new Map<string, FontConfig>();    

    public static GetInstance(): FontConfigPool {
        if (!this.instance) {
            this.instance = new FontConfigPool();
        }

        return this.instance;
    }

    public async GetFontConfig(fontPath): Promise<FontConfig> {
        const config = this.configs.get(fontPath);
        if (!config) {
            const created = await FontConfig.Create(fontPath);
            this.configs.set(fontPath, created);
            return created;
        }

        return config;
    }

    public async PreLoad(): Promise<void> {
    }

    public UnloadAll(): void {
        this.configs.clear();
    }
}