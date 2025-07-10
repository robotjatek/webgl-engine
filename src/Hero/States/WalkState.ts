import { HeroBaseState } from './HeroBaseState';
import { Hero } from '../../Hero';
import { IProjectile } from '../../Projectiles/IProjectile';
import { Animation } from '../../Components/Animation';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { SoundEffect } from '../../SoundEffect';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

export class WalkState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       private animation: Animation,
                       physicsComponent: PhysicsComponent,
                       damageComponent: DamageComponent,
                       private walkSound: SoundEffect,
                       sharedStateVariables: SharedHeroStateVariables) {
        super(hero, physicsComponent, damageComponent, spawnProjectile, sharedStateVariables);
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }

    protected override async UpdateState(delta: number): Promise<void> {

        if (this.hero.InputSource.Left()) {
            this.movementBehaviour.MoveLeft(delta);
        } else if (this.hero.InputSource.Right()) {
            this.movementBehaviour.MoveRight(delta);
        } else {
            await this.hero.ChangeState(this.hero.IDLE_STATE());
        }

        if (this.hero.InputSource.Dash()) {
            if (this.sharedStateVariables.timeSinceLastDash > 300 && this.sharedStateVariables.dashAvailable) {
                await this.hero.ChangeState(this.hero.DASH_STATE());
            }
        }

        if (this.hero.InputSource.Jump()) {
            await this.hero.ChangeState(this.hero.JUMP_STATE());
        }

        await this.PlayWalkSounds();
    }

    private async PlayWalkSounds(): Promise<void> {
        if (this.hero.IsWalking && this.physicsComponent.OnGround) {
            await this.walkSound.Play(1.8, 0.8);
        }
    }
}
