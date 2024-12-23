import { IState } from '../../../IState';
import { DragonEnemy } from '../../DragonEnemy';

export class AttackState implements IState {

    public constructor(private dragon: DragonEnemy) {
    }

    public async Update(delta: number): Promise<void> {
        // Bite attack is handled in the "idle" state
        this.dragon.ChangeState(this.dragon.IDLE_STATE());
        return;
    }

    public Enter(): void {
    }

    public Exit(): void {
    }

}