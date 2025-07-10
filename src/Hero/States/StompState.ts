import { HeroBaseState } from './HeroBaseState';
import { Hero } from '../Hero';
import { IProjectile } from '../../Projectiles/IProjectile';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { SoundEffect } from '../../SoundEffect';
import { vec3 } from 'gl-matrix';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

export class StompState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       damageComponent: DamageComponent,
                       private stompSound: SoundEffect,
                       sharedStateVariables: SharedHeroStateVariables,
                       private landSound: SoundEffect) {
        super(hero, physicsComponent, damageComponent, spawnProjectile, sharedStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {

        if (this.physicsComponent.OnGround) {
            if (vec3.squaredLength(this.physicsComponent.Velocity) < 0.00001) {
                await this.hero.ChangeState(this.hero.IDLE_STATE());
                this.sharedStateVariables.dashAvailable = true;
                await this.landSound.Play(1.8, 0.5);
            }
        }
    }

    public async Enter(): Promise<void> {
        // using Enter() so we only run this part of the code once
        this.physicsComponent.AddToExternalForce(vec3.fromValues(0, 0.05, 0));
        this.sharedStateVariables.timeSinceLastStomp = 0;
        const pitch = 0.8 + Math.random() * (1.25 - 0.8);
        await this.stompSound.Play(pitch);
    }

    public async Exit(): Promise<void> {
    }
}
