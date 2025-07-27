import { ILevelEvent } from './ILevelEvent';
import { Level } from '../Level';
import { SoundEffectPool } from '../SoundEffectPool';
import { Portcullis } from '../Actors/Portcullis';
import { vec3 } from 'gl-matrix';
import { TexturePool } from '../TexturePool';
import { IState } from '../IState';

export class StartedState implements IState {

    public constructor(private gateEvent: GateEvent,
                       private level: Level) {
    }

    public async Update(delta: number): Promise<void> {
        this.level.MainLayer.SetCollision(3, 5, true);
        this.level.MainLayer.SetCollision(3, 6, true);
        this.level.MainLayer.SetCollision(3, 7, true);
        this.level.MainLayer.SetCollision(3, 8, true);
        await this.gateEvent.ChangeState(this.gateEvent.SPAWN_GATE_TILES_STATE());
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

export class SpawnGateTilesState implements IState {

    private portcullisParts: Portcullis[] = [];

    public constructor(private gateEvent: GateEvent, private level: Level) {
        this.portcullisParts = gateEvent.PortcullisParts;
    }

    public async Update(delta: number): Promise<void> {
        const texture = await TexturePool.GetInstance().GetTexture('textures/portcullis.png');
        const texture_bottom = await TexturePool.GetInstance().GetTexture('textures/p2.png');
        this.portcullisParts.push(...[
            await Portcullis.Create(vec3.fromValues(3, 4, 0), texture_bottom, this.level.MainLayer),
            await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
            await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
            await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
            await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer)
        ]);
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

    public constructor(private gateEvent: GateEvent, private level: Level) {
        this.portcullisParts = gateEvent.PortcullisParts;
    }

    public async Update(delta: number): Promise<void> {
        const bottomPart = this.portcullisParts[0];
        if (bottomPart.Position[1] < 9) { // TODO: bottom prop
            bottomPart.Move(delta, vec3.fromValues(0, 0.002, 0));
        } else {
            bottomPart.ResetVelocity();
            bottomPart.Position[1] = 9; // TODO: bottom prop

            await this.gateEvent.ChangeState(this.gateEvent.ENEMY_SPAWN_STATE());
        }

        for (let i = 1; i < this.portcullisParts.length; i++) {
            const part = this.portcullisParts[i];
            const targetY = 4 + i; //bottom go all the way down to y=9, the others go to y=5,6,7,8 (start + i)

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
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

// TODO: track alive enemies
export class EnemyFightState implements IState {
    public constructor(private gateEvent: GateEvent, private level: Level) {
    }

    public async Update(delta: number): Promise<void> {

    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

// TODO: move to freecam
export class EnemiesDeadState implements IState {
    public constructor(private gateEvent: GateEvent, private level: Level) {
    }

    public async Update(delta: number): Promise<void> {

    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}

// TODO: start portcullis coord prop
// TODO: bottom prop

// TODO: spawn enemies
// TODO: track alive enemies
// TODO: let player move to the next gate when all enemies are dead --> move to freecam event
// TODO: remove event from level when done
export class GateEvent implements ILevelEvent {

    public static EVENT_KEY = 'gate_event';

    private portcullisParts: Portcullis[] = [];

    public STARTED_STATE(): IState {
        return new StartedState(this, this.level);
    }

    public SPAWN_GATE_TILES_STATE(): IState {
        return new SpawnGateTilesState(this, this.level);
    }

    public CLOSING_GATE_STATE(): IState {
        return new ClosingGateState(this, this.level);
    }

    public ENEMY_SPAWN_STATE(): IState {
        return new EnemySpawnState(this, this.level);
    }

    public ENEMY_FIGHT_STATE(): IState {
        return new EnemyFightState(this, this.level);
    }

    public ENEMIES_DEAD_STATE(): IState {
        return new EnemiesDeadState(this, this.level);
    }


    private state: IState;

    private constructor(private id: string,
                        private level: Level) {
        this.state = this.STARTED_STATE();
    }

    public static async Create(id: string, level: Level): Promise<GateEvent> {
        return new GateEvent(id, level);
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

    public Dispose(): void {
    }
}
