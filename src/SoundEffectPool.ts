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

    // TODO:key should be path + allowparallel pair
    public GetAudio(path: string, allowParallel: boolean = true) {
        const effect = this.effects.get(path);
        if (!effect) {
            const created = new SoundEffect(path, allowParallel);
            this.effects.set(path, created);
            return created;
        }

        return effect;
    }
}