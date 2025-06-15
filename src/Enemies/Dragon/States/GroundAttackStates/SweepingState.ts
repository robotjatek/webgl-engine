import { IState } from '../../../IState';
import { Hero } from '../../../../Hero';
import { DragonEnemy } from '../../DragonEnemy';
import { ICollider } from '../../../../ICollider';
import { IProjectile } from '../../../../Projectiles/IProjectile';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { vec3 } from 'gl-matrix';
import { Fireball } from '../../../../Projectiles/Fireball';
import { GroundAttackState } from './GroundAttackState';

export class SweepingState implements IState {

    private timeSignalingFireballAttack = 0;
    private signalingFireball = false;

    public constructor(private context: GroundAttackState,
                       private hero: Hero,
                       private dragon: DragonEnemy,
                       private collider: ICollider,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
                       private shared: SharedDragonStateVariables
    ) {
    }

    public async Update(delta: number): Promise<void> {
        // In sweeping state the dragon can spit a fireball
        const distance = vec3.distance(this.hero.CenterPosition, this.dragon.CenterPosition);
        if (this.shared.timeSinceLastFireBall > 1500) {
            // spit fireball
            if (distance < 30 && distance > 5) {
                // internal state in sweep: signal => (time in signaling) => spawn fireball
                if (!this.signalingFireball) {
                    this.dragon.SignalAttack();
                    this.signalingFireball = true;
                }
            }

            if (this.signalingFireball) {
                this.timeSignalingFireballAttack += delta;
            }

            if (this.timeSignalingFireballAttack > 10 / 60 * 1000) {
                // In ground attack the dragon spits the fireball on the x-axis only
                const projectileCenter = this.dragon.FireBallProjectileSpawnPosition;
                const fireball = await Fireball.Create(
                    projectileCenter,
                    vec3.scale(vec3.create(), this.dragon.FacingDirection, -0.015),
                    this.collider);

                this.spawnProjectile(this.dragon, fireball);
                this.timeSignalingFireballAttack = 0;
                this.signalingFireball = false;

                this.shared.timeSinceLastFireBall = 0;
            }

            if (distance < 6) {
                await this.context.ChangeState(this.context.ATTACK_STATE());
            }
        }

        // Random change back to "idle" to be able to change into different states
        const chance = Math.random();
        if (chance < 0.01) {
            await this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}
