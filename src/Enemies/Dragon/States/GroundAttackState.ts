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
    PRE_ATTACK,
    ATTACK
}

export class GroundAttackState extends DragonStateBase implements IState {

    private state: States = States.SWEEPING;
    private dir = vec3.fromValues(-0.01, 0, 0);

    public constructor(hero: Hero,
                       dragon: DragonEnemy,
                       private collider: ICollider,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void) {
        super(hero, dragon);
    }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        console.log('ground')
        if (this.dragon.WillCollide(this.dir, delta)) {
            this.dir = vec3.fromValues(this.dir[0] * -1, 0, 0);
        }
        this.dragon.Move(this.dir, delta);
        this.MatchHeroHeight(delta);

        if (this.state == States.SWEEPING) {
            const distance = vec3.distance(this.hero.CenterPosition, this.dragon.CenterPosition);
            if (shared.timeSinceLastFireBall > 1500) {
                // TODO: spit fireball with a random chance
                // TODO: signal spit fireball
                // spit fireball
                if (distance < 30 && distance > 10) {
                    // TODO: mint a bitenál ezt a kalkulációt is bemozgatni a dragonba
                    const projectileCenter = this.dragon.FacingDirection[0] > 0 ?
                        vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(-3, 1, 0)) :
                        vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(3, 1, 0));
                    const fireball = await Fireball.Create(
                        projectileCenter,
                        vec3.clone(this.dragon.FacingDirection),
                        this.collider);

                    this.spawnProjectile(this.dragon, fireball);
                    shared.timeSinceLastFireBall = 0;

                    if (distance < 6) {
                        this.state = States.ATTACK;
                    }
                }
            }

            const chance = Math.random();
            if (chance < 0.01) {
                this.dragon.ChangeState(this.dragon.IDLE_STATE());
            }
        } else if (this.state == States.PRE_ATTACK) {
            // TODO: signal attack?
        } else if (this.state == States.ATTACK) {
            // Bite attack is handled in the "idle" state
            this.dragon.ChangeState(this.dragon.IDLE_STATE());
        }
    }

    public Enter(): void {
    }

    public Exit(): void {
    }
}