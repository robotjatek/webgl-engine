import { Hero } from 'src/Hero';
import { DragonStateBase } from './DragonStateBase';
import { IState } from '../../IState';
import { DragonEnemy } from '../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { Layer } from '../../../Layer';

/**
 * Starting state for the dragon. Makes the dragon to move to a correct place inside the arena after spawning.
 * Transitions to {@link IdleState} when the correct position is reached.
 */
export class EnterArenaState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy, private layer: Layer, private enterWaypoint: vec3 | null) {
        super(hero, dragon);
    }

    public Enter(): void { }

    public async Update(delta: number): Promise<void> {
        if (this.enterWaypoint === null) {
            this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }

        // Reach the altitude of the waypoint - move on the axises separately
        const distanceFromAltitude = this.enterWaypoint[1] - this.dragon.CenterPosition[1];
        if (distanceFromAltitude > 0) {
            this.dragon.Move(vec3.fromValues(0, 0.005, 0), delta);
        }

        // Move to the predefined coordinates
        if (this.dragon.CenterPosition[0] > this.enterWaypoint[0]) {
            const dir = vec3.fromValues(-0.01, 0, 0);
            this.dragon.Move(dir, delta);
        } else {
            // close tiles
            // TODO: ezt a hardcodeot is meg kéne szüntetni
            this.layer.SetCollision(29, 11, true);
            this.layer.SetCollision(29, 12, true);
            this.layer.SetCollision(29, 13, true);
            this.layer.SetCollision(29, 14, true);
            this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }
    }

    public Exit(): void { }

}
