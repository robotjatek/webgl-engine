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
    public GetAudio(path: string, allowParallel: boolean = true): SoundEffect {
        const effect = this.effects.get(path);
        if (!effect) {
            const created = new SoundEffect(path, allowParallel);
            this.effects.set(path, created);
            return created;
        }

        return effect;
    }

    // TODO: need a synchronous way to wait for loading to complete
    public Preload(): void {
        this.GetAudio('audio/level.mp3', false);
        this.GetAudio('audio/fireball_spawn.mp3');
        this.GetAudio('audio/sword.mp3');
    }
}