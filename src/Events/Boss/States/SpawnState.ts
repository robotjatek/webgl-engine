import { IState } from '../../../IState';
import { IEnemy } from '../../../Enemies/IEnemy';
import { Level } from '../../../Level';
import { Hero } from '../../../Hero/Hero';
import { vec2, vec3 } from 'gl-matrix';
import { Point } from '../../../Point';
import { SoundEffect } from '../../../SoundEffect';
import { Camera } from '../../../Camera';
import { UIService } from '../../../UIService';
import { DragonEnemy } from '../../../Enemies/Dragon/DragonEnemy';
import { BossEvent } from '../BossEvent';
import { SharedBossEventVariables } from '../SharedBossEventVariables';

/**
 * Spawns the boss to the level
 */
export class SpawnState implements IState {
    private boss: IEnemy | null = null;

    public constructor(
        private context: BossEvent,
        private level: Level,
        private hero: Hero,
        private shared: SharedBossEventVariables,
        private bossPosition: vec3,
        private bossHealth: number,
        private enterWaypoint: Point,
        private roar: SoundEffect,
        private music: SoundEffect,
        private camera: Camera,
        private uiService: UIService,
        private shakeSound: SoundEffect
    ) { }

    public async Update(delta: number): Promise<void> {
        this.shared.started = true;
        // Spawn
        await this.roar.Play();
        await this.level.ChangeMusic(this.music, 0.5);
        this.shared.musicVolume = this.level.GetMusicVolume();
        this.shared.startMusicVolume = this.shared.musicVolume;

        this.boss = await DragonEnemy.Create(
            this.bossPosition,
            this.bossHealth,
            vec2.fromValues(5, 5),
            this.level.MainLayer,
            this.hero,
            async () => await this.OnBossDeath(),
            (sender, projectile) => {
                this.level.SpawnProjectile(projectile);
            },
            this.enterWaypoint);

        this.context.SpawnBoss(this.boss);
        await this.context.ChangeState(this.context.FIGHT_STATE())
    }

    public async Enter(): Promise<void> { }

    public async Exit(): Promise<void> { }

    private async OnBossDeath(): Promise<void> {
        this.level.RemoveGameObject(this.boss!);
        await this.shakeSound.Play(1, 1, null, true);
        this.camera.Shake = true;
        await this.context.ChangeState(this.context.BOSS_DEATH_STATE());
    }
}
