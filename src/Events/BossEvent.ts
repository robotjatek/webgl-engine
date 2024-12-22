import { IEnemy } from '../Enemies/IEnemy';
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
import { Point } from '../Point';

// TODO: state machine
enum State {
    SPAWN,
    FIGHT,
    BOSS_DEATH,
    HERO_EXIT,
}

export class BossEvent implements ILevelEvent {

    public static readonly EVENT_KEY = 'boss_event';
    private state: State = State.SPAWN;
    private boss: IEnemy;
    private started: boolean = false;
    private timeSinceBossDied = 0;

    private heroExitStartPosition: vec3;
    private musicVolume: number;
    private startMusicVolume: number;

    private constructor(private level: Level,
                        private hero: Hero,
                        private uiService: UIService,
                        private bossHealthText: Textbox,
                        private roar: SoundEffect,
                        private bossPosition: vec3,
                        private camera: Camera,
                        private shakeSound: SoundEffect,
                        private enterWaypoint: Point,
                        private music: SoundEffect
    ) {
    }

    public static async Create(level: Level,
                               hero: Hero,
                               uiService: UIService,
                               bossPosition: vec3,
                               camera: Camera,
                               enterWaypoint: Point): Promise<BossEvent> {
        const bossHealthText = await uiService.AddTextbox();
        const roar = await SoundEffectPool.GetInstance().GetAudio('audio/monster_small_roar.wav', false);
        const shakeSound = await SoundEffectPool.GetInstance().GetAudio('audio/shake.wav', false);
        const music = await SoundEffectPool.GetInstance().GetAudio('audio/hunters_chance.mp3', false);
        return new BossEvent(
            level, hero, uiService, bossHealthText, roar, bossPosition, camera, shakeSound, enterWaypoint, music);
    }

    // TODO: boss health parameter
    public async Update(delta: number): Promise<void> {
        if (this.state === State.SPAWN) {
            this.started = true;
            // Spawn
            this.roar.Play();
            this.level.ChangeMusic(this.music, 0.5);
            this.musicVolume = this.level.GetMusicVolume();
            this.startMusicVolume = this.musicVolume;

            this.boss = await DragonEnemy.Create(
                this.bossPosition,
                vec2.fromValues(5, 5),
                this.level.MainLayer,
                this.hero,
                () => this.OnBossDeath(),
                (sender, projectile) => {
                    this.level.SpawnProjectile(projectile);
                },
                this.enterWaypoint);

            this.level.AddGameObject(this.boss);
            this.state = State.FIGHT;
        } else if (this.state === State.FIGHT) {
            // Fight state
            // State change is handled in OnBossDeath
            const bossHealthText = `Liz the lizard queen: ${this.boss.Health} HP`;
            const dimensions = await Textbox.PrecalculateDimensions('Consolas', bossHealthText, 0.5);
            this.bossHealthText.WithText(bossHealthText, vec2.fromValues(
                this.uiService.Width / 2 - dimensions.width / 2, 50), 0.5)
                .WithSaturation(1);
        } else if (this.state === State.BOSS_DEATH) {
            // OnBoss death state    
            // move hero to the end marker
            this.hero.AcceptInput = false;
            this.timeSinceBossDied += delta;

            const musicStep = this.startMusicVolume / (3000 / delta);
            this.musicVolume -= musicStep;
            this.level.SetMusicVolume(this.musicVolume);
            this.heroExitStartPosition = this.hero.CenterPosition;

            // wait for some time before moving the hero
            if (this.timeSinceBossDied > 3000) {
                this.state = State.HERO_EXIT
            }
        } else if (this.state === State.HERO_EXIT) {
            // make exit tiles passable
            this.level.MainLayer.SetCollision(29, 11, false);
            this.level.MainLayer.SetCollision(29, 12, false);
            this.level.MainLayer.SetCollision(29, 13, false);
            this.level.MainLayer.SetCollision(29, 14, false);
            this.hero.MoveRight(0.01, delta);
        }

        // Lock camera in position
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
        this.uiService.RemoveTextbox(this.bossHealthText);
        this.level.RemoveGameObject(this.boss);
        this.shakeSound.Play(1, 1, null, true);
        this.camera.Shake = true;
        this.state = State.BOSS_DEATH;
    }

    public Dispose(): void {
        // RemoveGameObject disposes the boss enemy
        this.uiService.RemoveTextbox(this.bossHealthText);
        if (this.boss) {
            this.level.RemoveGameObject(this.boss);
            this.boss = null;
        }

        this.level.ChangeEvent(FreeCameraEvent.EVENT_KEY); // make sure that the event has been reset
    }

}