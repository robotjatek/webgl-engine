import { IEnemy } from './../Enemies/IEnemy';
import { Level } from 'src/Level';
import { ILevelEvent } from './ILevelEvent';
import { Hero } from 'src/Hero';
import { vec2, vec3 } from 'gl-matrix';
import { UIService } from 'src/UIService';
import { Textbox } from 'src/Textbox';
import { SoundEffectPool } from 'src/SoundEffectPool';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from 'src/Enemies/Dragon/DragonEnemy';
import { FreeCameraEvent } from './FreeCameraEvent';
import { Camera } from 'src/Camera';
import { Environment } from 'src/Environment';

// TODO: boss trigger + editor
// TODO: state machine
export class BossEvent implements ILevelEvent {

    public static readonly EVENT_KEY = 'boss_event';
    private state: number = 0;
    private boss: IEnemy;
    private started: boolean = false;
    private timeSinceBossDied = 0;

    private constructor(private level: Level,
        private hero: Hero,
        private uiService: UIService,
        private bossHealthText: Textbox,
        private roar: SoundEffect,
        private bossPosition: vec3,
        private camera: Camera,
        private shakeSound: SoundEffect
    ) {
    }

    public static async Create(level: Level, hero: Hero, uiService: UIService, bossPosition: vec3, camera: Camera): Promise<BossEvent> {
        const bossHealthText = await uiService.AddTextbox();
        const roar = await SoundEffectPool.GetInstance().GetAudio('audio/monster_small_roar.wav', false);
        const shakeSound = await SoundEffectPool.GetInstance().GetAudio('audio/shake.wav', false);
        return new BossEvent(level, hero, uiService, bossHealthText, roar, bossPosition, camera, shakeSound);
    }

    // TODO: boss health parameter
    public async Update(delta: number): Promise<void> {
        if (this.state === 0) {
            this.started = true;
            // Spawn
            this.roar.Play();
            // TODO: boss music
            this.boss = await DragonEnemy.Create(
                this.bossPosition,
                vec2.fromValues(5, 5),
                this.level.MainLayer,
                this.hero,
                () => this.OnBossDeath(),
                (sender, projectile) => {
                    this.level.SpawnProjectile(projectile);
                });

            this.level.AddGameObject(this.boss);
            this.state++;
        } else if (this.state === 1) {
            // Fight state
            // State change is handled in OnBossDeath
            const bossHealthText = `Liz the lizard queen: ${this.boss.Health} HP`;
            const dimensions = await Textbox.PrecalculateDimensions('Consolas', bossHealthText, 0.5);
            this.bossHealthText.WithText(bossHealthText, vec2.fromValues(
                this.uiService.Width / 2 - dimensions.width / 2, 50), 0.5)
                .WithSaturation(1);

        } else if (this.state === 2) {
            // OnBoss death state    
            // move hero to the end marker
            this.hero.AcceptInput = false;
            this.timeSinceBossDied += delta;
            // wait for some time before moving the hero
            if (this.timeSinceBossDied > 1500) {
                this.state++;
            }
        } else if (this.state === 3) {
            this.hero.MoveRight(0.01, delta);
        }

        const vec = vec3.fromValues(Environment.HorizontalTiles / 2, Environment.VerticalTiles, 0);
        this.camera.LookAtPosition(vec, this.level.MainLayer);
    }

    public get EventKey(): string {
        return BossEvent.EVENT_KEY;
    }

    public get CanStart(): boolean {
        return !this.started;
    }

    private OnBossDeath(): void {
        // TODO: fade out boss music
        this.uiService.RemoveTextbox(this.bossHealthText);
        this.level.RemoveGameObject(this.boss);
        this.shakeSound.Play(1, 1, null, true); // TODO: sound manager with global sounds? on/off
        this.camera.Shake = true;
        this.state++;
    }

    public Dispose(): void {
        // RemoveGameObject disposes the boss enemy
        this.uiService.RemoveTextbox(this.bossHealthText);
        if (this.boss) {
            this.level.RemoveGameObject(this.boss);
            this.boss = null;
        }
        this.level.ChangeEvent(FreeCameraEvent.EVENT_KEY); // make sure that the event reseted
    }

}