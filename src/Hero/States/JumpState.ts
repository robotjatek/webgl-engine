import { HeroBaseState } from './HeroBaseState';
import { Hero } from '../Hero';
import { IProjectile } from '../../Projectiles/IProjectile';
import { SoundEffect } from '../../SoundEffect';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { vec3 } from 'gl-matrix';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

// TODO: variable jump height
export class JumpState extends HeroBaseState {

    private remainingJumpTime: number = 0;
    private isJumping: boolean = false;
    private wasInAir: boolean = false;

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       private jumpSound: SoundEffect,
                       private landSound: SoundEffect,
                       physicsComponent: PhysicsComponent,
                       damageComponent: DamageComponent,
                       sharedStateVariables: SharedHeroStateVariables) {
        super(hero, physicsComponent, damageComponent, spawnProjectile, sharedStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {

        if (this.isJumping && this.remainingJumpTime > 0) {
            const force = vec3.fromValues(0, -0.013, 0);
            const jDelta = Math.min(this.remainingJumpTime, delta);
            this.physicsComponent.AddToExternalForce(force);
            this.remainingJumpTime -= jDelta;

            if (this.remainingJumpTime <= 0 && this.physicsComponent.OnGround) {
                this.isJumping = false;
            }
        }

        if (this.hero.InputSource.Left()) {
            this.movementBehaviour.MoveLeft(delta);
        } else if (this.hero.InputSource.Right()) {
            this.movementBehaviour.MoveRight(delta);
        }

        if (this.hero.InputSource.Dash()) {
            if (this.sharedStateVariables.timeSinceLastDash > 300 && this.sharedStateVariables.dashAvailable) {
                await this.hero.ChangeState(this.hero.DASH_STATE());
            }
        }

        if (this.hero.InputSource.Stomp() &&
            this.sharedStateVariables.timeSinceLastStomp > 500) {
            await this.hero.ChangeState(this.hero.STOMP_STATE());
        }

        if (this.physicsComponent.OnGround) {
            if ((this.wasInAir)) {
                await this.hero.ChangeState(this.hero.IDLE_STATE());
                this.wasInAir = false;
                this.isJumping = false;
                await this.landSound.Play(1.8, 0.5);
            }
        } else {
            this.wasInAir = true;
        }
    }

    public async Enter(): Promise<void> {
        this.remainingJumpTime = 150;
        await this.jumpSound.Play();
        this.isJumping = true;
    }

    public async Exit(): Promise<void> {
    }
}
