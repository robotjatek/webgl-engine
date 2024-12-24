import { Lock } from './Lock';
import { FontConfig } from './Textbox';

export class FontConfigPool {
    private constructor() {}

    private static instance: FontConfigPool;
    private configs = new Map<string, FontConfig>();    
    private lock = new Lock();

    public static GetInstance(): FontConfigPool {
        if (!this.instance) {
            this.instance = new FontConfigPool();
        }

        return this.instance;
    }

    public async GetFontConfig(fontPath: string): Promise<FontConfig> {
        await this.lock.lock(fontPath);
        const config = this.configs.get(fontPath);
        if (!config) {
            const created = await FontConfig.Create(fontPath);
            this.configs.set(fontPath, created);
            await this.lock.release(fontPath);
            return created;
        }

        await this.lock.release(fontPath);
        return config;
    }

    public async PreLoad(): Promise<void> {
    }

    public UnloadAll(): void {
        this.configs.clear();
    }
}