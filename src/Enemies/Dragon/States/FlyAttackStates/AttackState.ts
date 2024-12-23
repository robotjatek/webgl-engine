import { IState } from '../../../IState';
import { DragonEnemy } from '../../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { FlyAttackState } from './FlyAttackState';
import { SharedFlyAttackVariables } from './SharedFlyAttackVariables';

export class AttackState implements IState {

    public constructor(
        private context: FlyAttackState,
        private dragon: DragonEnemy,
        private shared: SharedFlyAttackVariables) {
    }

    public async Update(delta: number): Promise<void> {
        // Diagonal attack from above
        // The attack/bite itself is handled by the idle state
        // Move the dragon based on the position of the bite attack
        const attackDirection = vec3.sub(vec3.create(), this.shared.savedHeroPosition, this.dragon.BiteProjectilePosition);
        attackDirection[2] = 0;
        vec3.normalize(attackDirection, attackDirection);
        vec3.scale(attackDirection, attackDirection, 0.025); // hard coded attack speed

        this.dragon.Move(attackDirection, delta);

        const distanceToRushPosition = vec3.distance(this.shared.savedHeroPosition, this.dragon.CenterPosition);
        if (distanceToRushPosition < 2.0 || this.dragon.WillCollide(attackDirection, delta)) {
            this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }
    }

    public Enter(): void {
    }

    public Exit(): void {
    }

}