import { Lock } from './Lock';
import { SoundEffect } from './SoundEffect';

export class SoundEffectPool {
    private constructor() { }

    private static instance: SoundEffectPool;
    private effects = new Map<string, SoundEffect>();
    private lock = new Lock();

    public static GetInstance(): SoundEffectPool {
        if (!this.instance) {
            this.instance = new SoundEffectPool();
        }
        return this.instance;
    }

    // TODO:key should be path + allowparallel pair
    public async GetAudio(path: string, allowParallel: boolean = true): Promise<SoundEffect> {
        await this.lock.lock(path);
        const effect = this.effects.get(path);
        if (!effect) {
            const created = await SoundEffect.Create(path, allowParallel);
            this.effects.set(path, created);
            await this.lock.release(path);
            return created;
        }

        await this.lock.release(path);
        return effect;
    }

    public async Preload(): Promise<void> {
        await Promise.all([
            this.GetAudio('audio/fireball_spawn.mp3'),
            this.GetAudio('audio/sword.mp3'),
            this.GetAudio('audio/enemy_damage.wav'),
            this.GetAudio('audio/enemy_death.wav'),
            this.GetAudio('audio/bite.wav'),
            this.GetAudio('audio/bite2.wav'),
            this.GetAudio('audio/jump.wav'),
            this.GetAudio('audio/land.wav', false),
            this.GetAudio('audio/walk1.wav', false),
            this.GetAudio('audio/hero_stomp.wav', true),
            this.GetAudio('audio/hero_damage.wav'),
            this.GetAudio('audio/hero_die.wav', false),
            this.GetAudio('audio/collect.mp3'),
            this.GetAudio('audio/dragon_roar.mp3'),
            this.GetAudio('audio/charge_up.mp3'),
            this.GetAudio('audio/item1.wav', false),
            this.GetAudio('audio/ui2.mp3', false),
            this.GetAudio('audio/pause.mp3'),
            this.GetAudio('audio/cursor1.wav')
        ]);
    }

    public StopAll(): void {
        this.effects.forEach(e => e.Stop());
    }
}