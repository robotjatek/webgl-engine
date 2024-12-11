import { Hero } from 'src/Hero';
import { DragonStateBase } from './DragonStateBase';
import { IState } from './IState';
import { SharedDragonStateVariables } from './SharedDragonStateVariables';
import { DragonEnemy } from '../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { Layer } from '../../../Layer';

/**
 * Starting state for the dragon. Makes the dragon to move to a correct place inside the arena after spawning.
 * Transitions to {@link IdleState} when the correct position is reached.
 */
export class EnterArenaState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy, private layer: Layer) {
        super(hero, dragon);
    }

    public Enter(): void { }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        console.log('enter arena');
        // TODO: adjust coordinates -- meg nem hardcodeolni kéne...
        const distanceFromAltitude = 32 - this.dragon.CenterPosition[1];
        if (distanceFromAltitude > 0) {
            this.dragon.Move(vec3.fromValues(0, 0.005, 0), delta);
        }

        // TODO: nem hardcodolt érték kéne.
        // TODO: jobb és bal oldalon más az outof bounds
        // Move to the x:20 coordinate
        if (this.dragon.CenterPosition[0] > 20) {
            const dir = vec3.fromValues(-0.005, 0, 0);
            this.dragon.Move(dir, delta);
        } else {
            // close tiles
            this.layer.SetCollision(29, 11, true);
            this.layer.SetCollision(29, 12, true);
            this.layer.SetCollision(29, 13, true);
            this.layer.SetCollision(29, 14, true);
            this.dragon.ChangeState(this.dragon.IDLE_STATE());
        }
    }

    public Exit(): void { }

}
