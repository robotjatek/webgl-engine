import { DragonStateBase } from './DragonStateBase';
import { IState } from './IState';
import { SharedDragonStateVariables } from './SharedDragonStateVariables';
import { Hero } from '../../../Hero';
import { DragonEnemy } from '../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { Fireball } from '../../../Projectiles/Fireball';
import { ICollider } from '../../../ICollider';
import { IProjectile } from '../../../Projectiles/IProjectile';

enum States {
    SWEEPING,
    ATTACK
}

export class GroundAttackState extends DragonStateBase implements IState {

    private state: States = States.SWEEPING;
    private dir = vec3.fromValues(-0.01, 0, 0);
    private timeSignalingFireballAttack = 0;
    private signalingFireball = false;

    public constructor(hero: Hero,
                       dragon: DragonEnemy,
                       private collider: ICollider,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void) {
        super(hero, dragon);
    }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        // Move left and right. Change direction when colliding with a wall
        if (this.dragon.WillCollide(this.dir, delta)) {
            this.dir = vec3.fromValues(this.dir[0] * -1, 0, 0);
        }
        this.dragon.Move(this.dir, delta);
        this.MatchHeroHeight(delta);

        if (this.state === States.SWEEPING) {
            // In sweeping state the dragon can spit a fireball
            const distance = vec3.distance(this.hero.CenterPosition, this.dragon.CenterPosition);
            if (shared.timeSinceLastFireBall > 1500) {
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

                    shared.timeSinceLastFireBall = 0;
                }

                if (distance < 6) {
                    this.state = States.ATTACK;
                }
            }

            // Random change back to "idle" to be able to change into different states
            const chance = Math.random();
            if (chance < 0.01) {
                this.dragon.ChangeState(this.dragon.IDLE_STATE());
                return;
            }
        } else if (this.state === States.ATTACK) {
            // Bite attack is handled in the "idle" state
            this.dragon.ChangeState(this.dragon.IDLE_STATE());
            return;
        }
    }

    public Enter(): void {
    }

    public Exit(): void {
    }
}