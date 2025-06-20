import { IState } from '../../../IState';
import { DragonEnemy } from '../../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { FlyAttackState } from './FlyAttackState';

export class ReachAltitudeState implements IState {

    public constructor(private context: FlyAttackState, private dragon: DragonEnemy) {
    }

    public async Update(delta: number): Promise<void> {
        // fly up
        const destinationHeight = 6;
        const verticalDistance = destinationHeight - this.dragon.CenterPosition[1];

        if (verticalDistance < -0.01) {
            this.dragon.Move(vec3.fromValues(0, -0.0001, 0), delta);
        } else {
            await this.context.ChangeState(this.context.SWEEPING_STATE());
        }
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }

}
