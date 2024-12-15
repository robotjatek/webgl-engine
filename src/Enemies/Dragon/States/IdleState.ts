import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { ICollider } from 'src/ICollider';
import { BiteProjectile } from 'src/Projectiles/BiteProjectile';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../DragonEnemy';
import { IState } from './IState';
import { SharedDragonStateVariables } from './SharedDragonStateVariables';
import { DragonStateBase } from './DragonStateBase';

/**
 * The default state for the dragon behaviour.
 * If the hero is near enough then the dragon can bite him.
 * If the hero is far away then the dragon will spit fireballs at him.
 * Can transition to {@link RushState} if distance to hero is between 5 and 20 and there were enough time since the last rush attack
 */
export class IdleState extends DragonStateBase implements IState {

    public constructor(
        hero: Hero,
        dragon: DragonEnemy,
        private collider: ICollider,
        private biteAttackSound: SoundEffect,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void) {
        super(hero, dragon);
    }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        const distance = vec3.distance(this.dragon.CenterPosition, this.hero.CenterPosition);
        // Bite when the hero is near
        if (shared.timeSinceLastAttack > 2000) {
            shared.timeSinceLastAttack = 0;
            // Bite
            if (distance < 5) {
                const projectileCenter = this.dragon.BiteProjectilePosition;
                const bite = await BiteProjectile.Create(projectileCenter, this.dragon.FacingDirection);
                this.biteAttackSound.Play();
                this.spawnProjectile(this.dragon, bite);
            }
        }

        // Random chance to change into a different state
        const chance = Math.random();
        if (chance > 0.25 && chance < 0.30) {
            // Idle => fly state
            this.dragon.ChangeState(this.dragon.FLY_ATTACK_STATE());
            return;
        } else if (chance > 0.30 && chance < 0.35) {
            // idle => rush state
            this.dragon.ChangeState(this.dragon.RUSH_STATE());
            return;
        } else if (chance > 0.35) {
            this.dragon.ChangeState(this.dragon.GROUND_ATTACK_STATE());
            return;
        }
    }

    public Enter(): void {
        // Do nothing
    }

    public Exit(): void {
        // Do nothing
    }
}
