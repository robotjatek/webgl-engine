import { SoundEffect } from './SoundEffect';
export class SoundEffectPool {
    private constructor() { }

    private static instance: SoundEffectPool;
    private effects = new Map<string, SoundEffect>();

    public static GetInstance(): SoundEffectPool {
        if (!this.instance) {
            this.instance = new SoundEffectPool();
        }
        return this.instance;
    }

    public GetAudio(path: string) {
        const effect = this.effects.get(path);
        if (!effect) {
            const created = new SoundEffect(path);
            this.effects.set(path, created);
            return created;
        }

        return effect;
    }
}