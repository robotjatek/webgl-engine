import { IEnemy } from '../../Enemies/IEnemy';
import { Level } from 'src/Level';
import { ILevelEvent } from '../ILevelEvent';
import { Hero } from 'src/Hero';
import { vec3 } from 'gl-matrix';
import { UIService } from 'src/UIService';
import { Textbox } from 'src/Textbox';
import { SoundEffectPool } from 'src/SoundEffectPool';
import { SoundEffect } from 'src/SoundEffect';
import { FreeCameraEvent } from '../FreeCameraEvent';
import { Camera } from 'src/Camera';
import { Environment } from 'src/Environment';
import { Point } from '../../Point';
import { IState } from '../../Enemies/IState';
import { SpawnState } from './States/SpawnState';
import { SharedBossEventVariables } from './SharedBossEventVariables';
import { FightState } from './States/FightState';
import { BossDeathState } from './States/BossDeathState';
import { HeroExitState } from './States/HeroExitState';

export class BossEvent implements ILevelEvent {

    private shared: SharedBossEventVariables = {
        started: false,
        musicVolume: 0,
        startMusicVolume: 0
    };

    public SPAWN_STATE(): IState {
        return new SpawnState(this, this.level, this.hero, this.shared, this.bossPosition, this.enterWaypoint,
            this.roar, this.music, this.camera, this.uiService, this.shakeSound, this.bossHealthText);
    }

    public FIGHT_STATE(): IState {
        return new FightState(this.boss, this.uiService, this.bossHealthText);
    }

    public BOSS_DEATH_STATE(): IState {
        return new BossDeathState(this, this.hero, this.level, this.shared);
    }

    public HERO_EXIT_STATE(): IState {
        return new HeroExitState(this.level, this.hero);
    }

    private internalState: IState = this.SPAWN_STATE();

    public ChangeState(state: IState): void {
        this.internalState.Exit();
        this.internalState = state;
        this.internalState.Enter();
    }

    public static readonly EVENT_KEY = 'boss_event';
    private boss: IEnemy;

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
        await this.internalState.Update(delta);

        // Lock camera in position
        const vec = vec3.fromValues(Environment.HorizontalTiles / 2, Environment.VerticalTiles, 0);
        this.camera.LookAtPosition(vec, this.level.MainLayer);
    }

    public get EventKey(): string {
        return BossEvent.EVENT_KEY;
    }

    public get CanStart(): boolean {
        return !this.shared.started;
    }

    public SpawnBoss(boss: IEnemy): void {
        this.boss = boss;
        this.level.AddGameObject(boss);
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