import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { ICollider } from 'src/ICollider';
import { BiteProjectile } from 'src/Projectiles/BiteProjectile';
import { Fireball } from 'src/Projectiles/Fireball';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../DragonEnemy';
import { IState } from './IState';
import { SharedDragonStateVariables } from './SharedDragonStateVariables';
import { DragonStateBase } from './DragonStateBase';

export class IdleState extends DragonStateBase implements IState {

    public constructor(
        hero: Hero,
        dragon: DragonEnemy,
        private collider: ICollider,
        private biteAttackSound: SoundEffect,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void) { 
            super(hero, dragon);
        }

    async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        // Attack when the hero is near
        const distance = vec3.distance(this.dragon.CenterPosition, this.hero.CenterPosition);
        if (shared.timeSinceLastAttack > 2000) {
            shared.timeSinceLastAttack = 0;

            // Spit fireball
            if (distance < 30 && distance > 10) {
                const projectileCenter = this.dragon.FacingDirection[0] > 0 ?
                    vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(-3, 1, 0)) :
                    vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(3, 1, 0));
                const fireball = await Fireball.Create(
                    projectileCenter,
                    vec3.clone(this.dragon.FacingDirection),
                    this.collider);

                this.spawnProjectile(this.dragon, fireball);
            }

            // Bite
            else if (distance < 5) {
                const projectileCenter = this.dragon.FacingDirection[0] > 0 ?
                    vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(-3, 1, 0)) :
                    vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(3, 1, 0));
                const bite = await BiteProjectile.Create(projectileCenter, this.dragon.FacingDirection);
                this.biteAttackSound.Play(); // TODO: play sound in spawnProjectile? -- Az nem jó, mert a fireball és a bite is projectile
                this.spawnProjectile(this.dragon, bite);
            }
        }

        // Idle => Rush change
        // Change to charge attack when the hero is in the attack interval
        if (distance < 20 && distance > 5 && shared.timeSinceLastCharge > 5000) {
            this.dragon.ChangeState(this.dragon.RUSH_STATE());
            shared.timeSinceLastCharge = 0;
            shared.timeSinceLastAttack = 0;
        }

        this.MatchHeroHeight(delta);
    }
}
