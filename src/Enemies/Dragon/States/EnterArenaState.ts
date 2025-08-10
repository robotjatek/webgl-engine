import { Hero } from 'src/Hero/Hero';
import { DragonStateBase } from './DragonStateBase';
import { IState } from '../../../IState';
import { DragonEnemy } from '../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { Layer } from '../../../Layer';

/**
 * Starting state for the dragon. Makes the dragon to move to a correct place inside the arena after spawning.
 * Transitions to {@link IdleState} when the correct position is reached.
 */
export class EnterArenaState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy, private layer: Layer, private enterWaypoint: vec3 | null,
                       private readonly props: Record<string, any>) {
        super(hero, dragon);
    }

    public async Enter(): Promise<void> { }

    public async Update(delta: number): Promise<void> {
        if (this.enterWaypoint === null) {
            await this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }

        // Move to the predefined coordinates
        if (this.dragon.CenterPosition[0] > this.enterWaypoint[0]) {
            const dir = vec3.fromValues(-0.00015, 0, 0);
            this.dragon.Move(dir, delta);
        } else {
            // close tiles
            const blockedTiles = this.props['blockedTiles'] as { xPos: number, yPos: number }[];
            blockedTiles.forEach(x => {
                const xPos = Number(x.xPos);
                const yPos = Number(x.yPos);
                this.layer.SetCollision(xPos, yPos, true);
            });

            await this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }
    }

    public async Exit(): Promise<void> { }

}
