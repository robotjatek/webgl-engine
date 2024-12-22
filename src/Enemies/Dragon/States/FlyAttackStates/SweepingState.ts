import { IState } from '../../../IState';
import { vec3 } from 'gl-matrix';
import { DragonEnemy } from '../../DragonEnemy';
import { IProjectile } from '../../../../Projectiles/IProjectile';
import { ICollider } from '../../../../ICollider';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { Firebomb } from '../../../../Projectiles/Firebomb';
import { FlyAttackState } from './FlyAttackState';

export class SweepingState implements IState {

    private dir = vec3.fromValues(-0.01, 0, 0);

    public constructor(
        private context: FlyAttackState,
        private dragon: DragonEnemy,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
        private collider: ICollider,
        private shared: SharedDragonStateVariables
    ) {
    }

    public async Update(delta: number): Promise<void> {
        // left-right movement
        // change direction on collision
        if (this.dragon.WillCollide(this.dir, delta)) {
            this.dir = vec3.fromValues(this.dir[0] * -1, 0, 0);
        }
        this.dragon.Move(this.dir, delta);

        // spit fireballs while sweeping
        const variance = 1500 + Math.random() * 1000; // 1500-2500
        if (this.shared.timeSinceLastFireBall > variance) {
            this.shared.timeSinceLastFireBall = 0;
            const fireball = await Firebomb.Create(this.dragon.FireBallProjectileSpawnPosition, this.collider);
            this.spawnProjectile(this.dragon, fireball);
        }

        const randomTrigger = Math.random();
        if (randomTrigger < 0.01) {
            this.context.ChangeState(this.context.PRE_FLY_ATTACK_STATE());
        }
    }

    public Enter(): void {
    }

    public Exit(): void {
    }
}