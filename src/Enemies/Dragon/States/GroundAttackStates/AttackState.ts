import { IState } from '../../../IState';
import { DragonEnemy } from '../../DragonEnemy';

export class AttackState implements IState {

    public constructor(private dragon: DragonEnemy) {
    }

    public async Update(delta: number): Promise<void> {
        // Bite attack is handled in the "idle" state
        await this.dragon.ChangeState(this.dragon.IDLE_STATE());
        return;
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }

}