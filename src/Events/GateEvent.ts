import { ILevelEvent } from './ILevelEvent';
import { Level } from '../Level';
import { SoundEffectPool } from '../SoundEffectPool';
import { Portcullis } from '../Actors/Portcullis';
import { vec3 } from 'gl-matrix';
import { TexturePool } from '../TexturePool';

enum State {
    STARTED,
    SPAWN_GATE_TILES,
    CLOSING_GATE,
    ENEMY_SPAWN,
    ENEMY_FIGHT,
    ENEMIES_DEAD
}

// TODO: start portcullis coord prop
// TODO: bottom prop

// TODO: spawn enemies
// TODO: track alive enemies
// TODO: let player move to the next gate when all enemies are dead --> move to freecam event
// TODO: remove event from level when done
export class GateEvent implements ILevelEvent {

    public static EVENT_KEY = 'gate_event';

    private state: State = State.STARTED;
    private portcullisParts: Portcullis[] = [];

    private constructor(private id: string,
                        private level: Level) {
    }

    public static async Create(id: string, level: Level): Promise<GateEvent> {
        return new GateEvent(id, level);
    }

    public get EventKey(): string {
        return GateEvent.EVENT_KEY + ':' + this.id;
    }

    public async Update(delta: number): Promise<void> {
        if (this.state === State.STARTED) {
            this.level.MainLayer.SetCollision(3, 5, true);
            this.level.MainLayer.SetCollision(3, 6, true);
            this.level.MainLayer.SetCollision(3, 7, true);
            this.level.MainLayer.SetCollision(3, 8, true);
            this.state = State.SPAWN_GATE_TILES;
        } else if (this.state === State.SPAWN_GATE_TILES) {
            const texture = await TexturePool.GetInstance().GetTexture('textures/portcullis.png');
            const texture_bottom = await TexturePool.GetInstance().GetTexture('textures/p2.png');
            this.portcullisParts =
                [
                    await Portcullis.Create(vec3.fromValues(3, 4, 0), texture_bottom, this.level.MainLayer),
                    await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
                    await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
                    await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
                    await Portcullis.Create(vec3.fromValues(3, 4, 0), texture, this.level.MainLayer),
                ];
            this.portcullisParts.forEach(o => this.level.AddGameObject(o));
            this.state = State.CLOSING_GATE;
        } else if (this.state === State.CLOSING_GATE) {
            const bottomPart = this.portcullisParts[0];
            if (bottomPart.Position[1] < 9) { // TODO: bottom prop
                bottomPart.Move(delta, vec3.fromValues(0, 0.002, 0));
            } else {
                bottomPart.ResetVelocity();
                bottomPart.Position[1] = 9; // TODO: bottom prop

                // TODO: ez talán lehetne az exitben
                await (await SoundEffectPool.GetInstance().GetAudio('audio/bridge/gate_boom.mp3', false)).Play(1, 1, () => {
                    this.state = State.ENEMY_SPAWN;
                });
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


            // TODO: play sound --> enter
            // await (await SoundEffectPool.GetInstance().GetAudio('audio/bridge/gate2.mp3', false)).Play(1, 1, async () => {
            //     await (await SoundEffectPool.GetInstance().GetAudio('audio/bridge/gate_boom.mp3', false)).Play();
            //     this.state = State.ENEMY_SPAWN;
            // });

        } else if (this.state === State.ENEMY_SPAWN) {
            console.log('Spawning enemies...');
        } else if (this.state === State.ENEMY_FIGHT) {

            // TODO: track alive enemies
        } else if (this.state === State.ENEMIES_DEAD) {
            // TODO: move to freecam
        }
    }

    public get CanStart(): boolean {
        return true;
    }

    public Dispose(): void {
    }
}
