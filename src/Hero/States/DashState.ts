import { HeroBaseState } from './HeroBaseState';
import { Hero } from '../Hero';
import { IProjectile } from '../../Projectiles/IProjectile';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { SoundEffect } from '../../SoundEffect';
import { vec3 } from 'gl-matrix';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

export class DashState extends HeroBaseState {
    private done = false;

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       damageComponent: DamageComponent,
                       private dashSound: SoundEffect,
                       sharedStateVariables: SharedHeroStateVariables) {
        super(hero, physicsComponent, damageComponent, spawnProjectile, sharedStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {

        if (!this.done) {
            this.sharedStateVariables.timeSinceLastDash = 0;
            this.sharedStateVariables.dashAvailable = false;
            this.sharedStateVariables.dashUsed = true;
            this.physicsComponent.AddToExternalForce(vec3.fromValues(0.08 * this.hero.FacingDirection[0], 0, 0));
            const pitch = 0.8 + Math.random() * (1.25 - 0.8);
            await this.dashSound.Play(pitch);
            this.done = true;
        }

        if (this.sharedStateVariables.timeSinceLastDash > 300) {
            await this.hero.ChangeState(this.hero.IDLE_STATE());
        }
    }

    public async Enter(): Promise<void> {
        this.physicsComponent.DisableGravity();
        this.physicsComponent.ResetVerticalVelocity();
    }

    public async Exit(): Promise<void> {
        this.physicsComponent.EnableGravity();
    }
}
