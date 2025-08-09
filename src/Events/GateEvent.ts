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

/**
 * Starts the gate event by creating the portcullis tiles
 * Also sets the collision for the gate tiles
 * Moves to {@link SpawnGateTilesState}
 */
export class StartedState implements IState {

    public constructor(private gateEvent: GateEvent,
                       private level: Level,
                       private props: Record<string, any>) {
    }

    public async Update(delta: number): Promise<void> {
        for (let i = Number(this.props.startY); i <= Number(this.props.endY); i++) {
            this.level.MainLayer.SetCollision(Number(this.props.startX), i, true);
        }
        await this.gateEvent.ChangeState(this.gateEvent.SPAWN_GATE_TILES_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

/**
 * Spawns the portcullis tiles
 * Moves to {@link ClosingGateState}
 */
export class SpawnGateTilesState implements IState {

    private portcullisParts: Portcullis[] = [];

    public constructor(private gateEvent: GateEvent,
                       private level: Level,
                       private props: Record<string, any>) {
        this.portcullisParts = gateEvent.PortcullisParts;
    }

    public async Update(delta: number): Promise<void> {
        const texture = await TexturePool.GetInstance().GetTexture('textures/portcullis.png');
        const texture_bottom = await TexturePool.GetInstance().GetTexture('textures/p2.png');
        const numberToSpawn = this.props.endY - this.props.startY;

        for (let i = 0; i < numberToSpawn; i++) {
            const t = i === 0 ? texture_bottom : texture;
            this.portcullisParts.push(
                await Portcullis.Create(
                    vec3.fromValues(Number(this.props.startX), Number(this.props.startY), 0), t, this.level.MainLayer));
        }

        this.portcullisParts.forEach(o => this.level.AddGameObject(o));
        await this.gateEvent.ChangeState(this.gateEvent.CLOSING_GATE_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

/**
 * Closes the gate by moving the portcullis parts down
 * Moves to {@link EnemySpawnState} when the gate is closed
 */
export class ClosingGateState implements IState {

    private readonly portcullisParts: Portcullis[] = [];

    public constructor(private gateEvent: GateEvent,
                       private props: Record<string, any>) {
        this.portcullisParts = gateEvent.PortcullisParts;
    }

    public async Update(delta: number): Promise<void> {
        const bottomPart = this.portcullisParts[0];
        if (bottomPart.Position[1] < Number(this.props.endY)) {
            bottomPart.Move(delta, vec3.fromValues(0, 0.002, 0));
        } else {
            bottomPart.ResetVelocity();
            bottomPart.Position[1] = Number(this.props.endY);

            await this.gateEvent.ChangeState(this.gateEvent.ENEMY_SPAWN_STATE());
        }

        // First part it the bottom part which we move separately, so we start from 1
        for (let i = 1; i < this.portcullisParts.length; i++) {
            const part = this.portcullisParts[i];
            const targetY = Number(this.props.startY) + i;

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

/**
 * Spawns enemies in the arena
 * Moves to {@link CenterCameraState} when enemies are spawned
 */
export class EnemySpawnState implements IState {

    public constructor(private gateEvent: GateEvent, private level: Level, private props: Record<string, any>) {
    }

    public async Update(delta: number): Promise<void> {
        console.log('Spawning enemies...');

        const enemyFactory = {
            'slime': (x: number, y: number, ai: SlimeAIMode) => SlimeEnemy.Create(
                vec3.fromValues(x, y - 1.8, 1), vec2.fromValues(3, 3),
                this.level.MainLayer, this.level.Hero, ai,
                c => this.gateEvent.RemoveEnemy(c))
        }

        const enemiesProp = this.props['enemies'] as [];
        const enemies: IGameobject[] = await Promise.all(enemiesProp.map(async ep => {
            const x = Number(ep['xPos']);
            const y = Number(ep['yPos']);
            const aiKey = String(ep['ai']).toUpperCase() as keyof typeof SlimeAIMode;
            const ai = SlimeEnemy.AIMode[aiKey];
            const type = ep['type'] as keyof typeof enemyFactory;
            return await enemyFactory[type](x, y, ai);
        }));

        this.gateEvent.AddEnemies(enemies);

        await this.gateEvent.ChangeState(this.gateEvent.CENTER_CAMERA_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

/**
 * Centers the camera to the arena center position
 * Moves to {@link EnemyFightState} when the camera is centered to the arena center
 */
export class CenterCameraState implements IState {

    private static readonly CAMERA_SPEED = 0.015;
    private readonly arenaCenter: vec3;


    public constructor(private gateEvent: GateEvent, private level: Level, private props: Record<string, any>) {
        const startX = Number(this.props['startX']);
        const endX = Number(this.props['endX']);
        const centerX = (endX - startX) / 2 + startX;
        this.arenaCenter = vec3.fromValues(centerX, gateEvent.Camera.Position[1], 1);
    }

    public async Update(delta: number): Promise<void> {
        console.log('Centering camera to arena center: ' + this.arenaCenter[0]);

        // Move the camera towards the center position while keeping the y-axis intact
        const camera = this.gateEvent.Camera;
        const direction = vec3.create();
        vec3.subtract(direction, this.arenaCenter, camera.Position);
        vec3.normalize(direction, direction);
        vec3.scale(direction, direction, CenterCameraState.CAMERA_SPEED * delta);

        const newPosition = vec3.create();
        vec3.add(newPosition, camera.Position, direction);
        camera.LookAtPosition(newPosition, this.level.MainLayer);

        if (vec3.distance(camera.Position, this.arenaCenter) < 0.1) {
            await this.gateEvent.ChangeState(this.gateEvent.ENEMY_FIGHT_STATE());
            return;
        }
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }

}

/**
 * Counts the number of enemies remaining and moves to {@link EnemiesDeadState} when all enemies are dead
 * Moves to {@link FreeCameraEvent} when all enemies are dead
 */
export class EnemyFightState implements IState {

    public constructor(private gateEvent: GateEvent, private level: Level, private props: Record<string, any>) {
    }

    public async Update(delta: number): Promise<void> {
        console.log('Fighting enemies...');

        if (this.gateEvent.EnemyCount === 0) {
            await this.gateEvent.ChangeState(this.gateEvent.ENEMIES_DEAD_STATE());
        }
    }

    public async Enter(): Promise<void> {
        for (let i = Number(this.props.startY); i <= Number(this.props.endY); i++) {
            this.level.MainLayer.SetCollision(Number(this.props.endX), i, true);
        }
    }

    public async Exit(): Promise<void> {
    }
}

/**
 * Moves the camera towards the hero position and opens the gate when the camera is centered to the hero position
 * Moves to {@link FreeCameraEvent} when the camera is centered to the hero position
 */
export class EnemiesDeadState implements IState {
    private static readonly CAMERA_SPEED = 0.015;
    private lastPosition: vec3 = vec3.create();

    public constructor(private gateEvent: GateEvent, private level: Level, private props: Record<string, any>) {
    }

    public async Update(delta: number): Promise<void> {
        // Move the camera towards the hero position
        const camera = this.gateEvent.Camera;
        const hero = this.level.Hero;
        const direction = vec3.create();
        vec3.subtract(direction, hero.Position, camera.Position);
        vec3.normalize(direction, direction);
        vec3.scale(direction, direction, EnemiesDeadState.CAMERA_SPEED * delta);

        const newPosition = vec3.create();
        vec3.add(newPosition, camera.Position, direction);
        camera.LookAtPosition(newPosition, this.level.MainLayer);

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
        for (let i = Number(this.props.startY); i <= Number(this.props.endY); i++) {
            console.log('Setting collision for y: ' + i);
            this.level.MainLayer.SetCollision(Number(this.props.endX), i, false);
        }
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
        return new StartedState(this, this.level, this.props);
    }

    public SPAWN_GATE_TILES_STATE(): IState {
        return new SpawnGateTilesState(this, this.level, this.props);
    }

    public CLOSING_GATE_STATE(): IState {
        return new ClosingGateState(this, this.props);
    }

    public ENEMY_SPAWN_STATE(): IState {
        return new EnemySpawnState(this, this.level, this.props);
    }

    public CENTER_CAMERA_STATE(): IState {
        return new CenterCameraState(this, this.level, this.props);
    }

    public ENEMY_FIGHT_STATE(): IState {
        return new EnemyFightState(this, this.level, this.props);
    }

    public ENEMIES_DEAD_STATE(): IState {
        return new EnemiesDeadState(this, this.level, this.props);
    }

    private state: IState;

    private constructor(private id: string,
                        private camera: Camera,
                        private level: Level,
                        private readonly props: Record<string, any>) {
        this.state = this.STARTED_STATE();
    }

    public static async Create(id: string, camera: Camera, level: Level, props: Record<string, any>): Promise<GateEvent> {
        return new GateEvent(id, camera, level, props);
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
