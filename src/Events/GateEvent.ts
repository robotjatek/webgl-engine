import { ILevelEvent } from './ILevelEvent';
import { Level } from '../Level';
import { SoundEffectPool } from '../SoundEffectPool';
import { Portcullis } from '../Actors/Portcullis';
import { vec2, vec3 } from 'gl-matrix';
import { TexturePool } from '../TexturePool';
import { IState } from '../IState';
import { SlimeAIMode, SlimeEnemy } from '../Enemies/Slime/SlimeEnemy';
import { FreeCameraEvent } from './FreeCameraEvent';
import { IGameobject } from '../IGameobject';
import { Camera } from '../Camera';

export class StartedState implements IState {

    public constructor(private gateEvent: GateEvent,
                       private level: Level,
                       private startX: number,
                       private startY: number,
                       private endY: number) {
    }

    public async Update(delta: number): Promise<void> {
        for (let i = this.startY; i <= this.endY; i++) {
            this.level.MainLayer.SetCollision(this.startX, i, true);
        }
        await this.gateEvent.ChangeState(this.gateEvent.SPAWN_GATE_TILES_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

export class SpawnGateTilesState implements IState {

    private portcullisParts: Portcullis[] = [];

    public constructor(private gateEvent: GateEvent,
                       private level: Level,
                       private startX: number,
                       private startY: number,
                       private endY: number) {
        this.portcullisParts = gateEvent.PortcullisParts;
    }

    public async Update(delta: number): Promise<void> {
        const texture = await TexturePool.GetInstance().GetTexture('textures/portcullis.png');
        const texture_bottom = await TexturePool.GetInstance().GetTexture('textures/p2.png');
        const numberToSpawn = this.endY - this.startY;

        for (let i = 0; i < numberToSpawn; i++) {
            const t = i === 0 ? texture_bottom : texture;
            this.portcullisParts.push(
                await Portcullis.Create(vec3.fromValues(this.startX, this.startY, 0), t, this.level.MainLayer)
            )
        }

        this.portcullisParts.forEach(o => this.level.AddGameObject(o));
        await this.gateEvent.ChangeState(this.gateEvent.CLOSING_GATE_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

export class ClosingGateState implements IState {

    private readonly portcullisParts: Portcullis[] = [];

    public constructor(private gateEvent: GateEvent,
                       private startY: number,
                       private endY: number) {
        this.portcullisParts = gateEvent.PortcullisParts;
    }

    public async Update(delta: number): Promise<void> {
        const bottomPart = this.portcullisParts[0];
        if (bottomPart.Position[1] < this.endY) {
            bottomPart.Move(delta, vec3.fromValues(0, 0.002, 0));
        } else {
            bottomPart.ResetVelocity();
            bottomPart.Position[1] = this.endY;

            await this.gateEvent.ChangeState(this.gateEvent.ENEMY_SPAWN_STATE());
        }

        // First part it the bottom part which we move separately, so we start from 1
        for (let i = 1; i < this.portcullisParts.length; i++) {
            const part = this.portcullisParts[i];
            const targetY = Number(this.startY) + i;

            if (part.Position[1] < targetY) {
                part.Move(delta, vec3.fromValues(0, 0.002, 0));
            } else {
                part.ResetVelocity();
                part.Position[1] = targetY;
            }
        }
    }

    public async Enter(): Promise<void> {
        await (await SoundEffectPool.GetInstance().GetAudio('audio/bridge/gate2.mp3', false)).Play();
    }

    public async Exit(): Promise<void> {
        await (await SoundEffectPool.GetInstance().GetAudio('audio/bridge/gate_boom.mp3', false)).Play();
    }
}

export class EnemySpawnState implements IState {

    public constructor(private gateEvent: GateEvent, private level: Level) {
    }

    public async Update(delta: number): Promise<void> {
        console.log('Spawning enemies...');

        // TODO: enemy positions input
        const x = 34;
        const y = 9;

        const enemies = [
            await SlimeEnemy.Create(
                vec3.fromValues(x, y - 1.8, 1),
                vec2.fromValues(3, 3),
                this.level.MainLayer,
                this.level.Hero,
                SlimeAIMode.AGGRESSIVE,
                c => this.gateEvent.RemoveEnemy(c))
        ];

        this.gateEvent.AddEnemies(enemies);
        await this.gateEvent.ChangeState(this.gateEvent.ENEMY_FIGHT_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

export class EnemyFightState implements IState {
    public constructor(private gateEvent: GateEvent) {
    }

    public async Update(delta: number): Promise<void> {
        console.log('Fighting enemies...');

        if (this.gateEvent.EnemyCount === 0) {
            await this.gateEvent.ChangeState(this.gateEvent.ENEMIES_DEAD_STATE());
        }
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

export class EnemiesDeadState implements IState {
    private static readonly CAMERA_SPEED = 0.01;
    private lastPosition: vec3 = vec3.create();

    public constructor(private gateEvent: GateEvent, private level: Level) {
    }

    public async Update(delta: number): Promise<void> {
        const camera = this.gateEvent.Camera;
        const hero = this.level.Hero;
        const direction = vec3.create();
        vec3.subtract(direction, hero.Position, camera.Position);
        vec3.normalize(direction, direction);
        vec3.scale(direction, direction, EnemiesDeadState.CAMERA_SPEED * delta);

        const newPosition = vec3.create();
        vec3.add(newPosition, camera.Position, direction);
        camera.LookAtPosition(newPosition, this.level.MainLayer);
        console.log(camera.Position);

        if (vec3.distance(camera.Position, this.lastPosition) < 0.01) {
            this.level.ChangeEvent(FreeCameraEvent.EVENT_KEY);
            this.lastPosition = vec3.create();
            return;
        }

        vec3.copy(this.lastPosition, camera.Position);
    }

    public async Enter(): Promise<void> {
        this.lastPosition = vec3.create();
        console.log('Enemies dead, moving to hero position...');
    }

    public async Exit(): Promise<void> {
        console.log('Reached hero position, moving to free camera...');
    }
}

export class GateEvent implements ILevelEvent {

    public static EVENT_KEY = 'gate_event';

    private portcullisParts: Portcullis[] = [];
    private enemies: IGameobject[] = [];

    public STARTED_STATE(): IState {
        return new StartedState(this, this.level, this.startX, this.startY, this.endY);
    }

    public SPAWN_GATE_TILES_STATE(): IState {
        return new SpawnGateTilesState(this, this.level, this.startX, this.startY, this.endY);
    }

    public CLOSING_GATE_STATE(): IState {
        return new ClosingGateState(this, this.startY, this.endY);
    }

    public ENEMY_SPAWN_STATE(): IState {
        return new EnemySpawnState(this, this.level);
    }

    public ENEMY_FIGHT_STATE(): IState {
        return new EnemyFightState(this);
    }

    public ENEMIES_DEAD_STATE(): IState {
        return new EnemiesDeadState(this, this.level);
    }

    private state: IState;

    private constructor(private id: string,
                        private camera: Camera,
                        private level: Level,
                        private startX: number,
                        private startY: number,
                        private endY: number) {
        this.state = this.STARTED_STATE();
    }

    public static async Create(id: string, camera: Camera, level: Level, startX: number, startY: number, endY: number): Promise<GateEvent> {
        return new GateEvent(id, camera, level, startX, startY, endY);
    }

    public get EventKey(): string {
        return GateEvent.EVENT_KEY + ':' + this.id;
    }

    public get PortcullisParts(): Portcullis[] {
        return this.portcullisParts;
    }

    public async ChangeState(state: IState): Promise<void> {
        await this.state.Exit();
        this.state = state;
        await this.state.Enter();
    }

    public async Update(delta: number): Promise<void> {
        await this.state.Update(delta);
    }

    public get CanStart(): boolean {
        return true;
    }

    public AddEnemies(enemies: IGameobject[]): void {
        this.enemies = enemies;
        enemies.forEach(o => this.level.AddGameObject(o));
    }

    public RemoveEnemy(enemy: IGameobject): void {
        // We don't call dispose here, level.RemoveGameObject will do that
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            this.enemies.splice(index, 1);
            this.level.RemoveGameObject(enemy);
        }
    }

    public get EnemyCount(): number {
        return this.enemies.length;
    }

    public get Camera() : Camera {
        return this.camera;
    }

    public Dispose(): void {
    }
}
