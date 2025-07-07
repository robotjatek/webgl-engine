import { IState } from '../../IState';
import { Hero, SharedHeroStateVariables } from '../../Hero';
import { vec2, vec3 } from 'gl-matrix';
import { Animation } from '../../Components/Animation';
import { SoundEffect } from '../../SoundEffect';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { MeleeAttack } from '../../Projectiles/MeleeAttack';
import { IProjectile } from '../../Projectiles/IProjectile';
import { HeroMovementBehaviour } from '../HeroMovementBehaviour';

export abstract class HeroBaseState implements IState {

    protected movementBehaviour: HeroMovementBehaviour;

    protected constructor(protected hero: Hero,
                          protected physicsComponent: PhysicsComponent,
                          private SpawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                          protected sharedStateVariables: SharedHeroStateVariables) {
        this.movementBehaviour = new HeroMovementBehaviour(hero, physicsComponent);
    }

    abstract Enter(): Promise<void>;
    abstract Exit(): Promise<void>;

    async Update(delta: number): Promise<void> {
        // Handle death
        if (this.hero.Health <= 0) {
            await this.hero.ChangeState(this.hero.DEAD_STATE());
        }

        await this.HandleInput();
        this.OverHealCountdown();
        this.sharedStateVariables.timeSinceLastMeleeAttack += delta;
        this.sharedStateVariables.timeInOverHeal += delta;
        this.sharedStateVariables.timeSinceLastDash += delta;
        this.sharedStateVariables.timeSinceLastStomp += delta;

        await this.UpdateState(delta);
    }

    /**
     * Internal update method for classes that implement {@link HeroBaseState}
     * @param delta elapsed time since last tick in ms
     */
    protected abstract UpdateState(delta: number): Promise<void>;

    private async HandleInput(): Promise<void> {
        if (this.hero.InputSource.Attack()) {
            const attackPosition = this.AttackSpawnPosition;
            if (this.sharedStateVariables.timeSinceLastMeleeAttack > 350) {
                this.sharedStateVariables.timeSinceLastMeleeAttack = 0;
                if (this.SpawnProjectile) {
                    // TODO: creating an attack instance on every attack is wasteful.
                    this.SpawnProjectile(this.hero, await MeleeAttack.Create(attackPosition, this.hero.FacingDirection));
                }
            }
        }
    }

    private get AttackSpawnPosition(): vec3 {
        return this.hero.FacingDirection[0] > 0 ?
            vec3.add(vec3.create(), this.hero.CenterPosition, vec3.fromValues(0, -1, 0)) :
            vec3.add(vec3.create(), this.hero.CenterPosition, vec3.fromValues(-4, -1, 0));
    }

    private OverHealCountdown() {
        if (this.hero.Health > 100) {
            if (this.sharedStateVariables.timeInOverHeal > 1000) {
                this.hero.Health--;
                this.sharedStateVariables.timeInOverHeal = 0;
            }
        }
    }

}

export class IdleState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       sharedStateVariables: SharedHeroStateVariables,
                       private animation: Animation){
        super(hero, physicsComponent, spawnProjectile, sharedStateVariables);
    }

    protected async UpdateState(delta: number): Promise<void> {
        if (this.hero.InputSource.Left()) {
            this.movementBehaviour.MoveLeft(delta);
            await this.hero.ChangeState(this.hero.WALK_STATE());
        } else if (this.hero.InputSource.Right()) {
            this.movementBehaviour.MoveRight(delta);
            await this.hero.ChangeState(this.hero.WALK_STATE());
        } else if (this.hero.InputSource.Jump()) {
            await this.hero.ChangeState(this.hero.JUMP_STATE());
        } else if (this.hero.InputSource.Stomp() &&
            this.sharedStateVariables.timeSinceLastStomp > 500 &&
            !this.physicsComponent.OnGround) {
            await this.hero.ChangeState(this.hero.STOMP_STATE());
        }

        if (this.physicsComponent.OnGround) {
            this.sharedStateVariables.dashAvailable = true;
        }
    }

    public async Enter(): Promise<void> {
        this.animation.Stop();
    }

    public async Exit(): Promise<void> {
        this.animation.Start();
    }

}

export class DashState extends HeroBaseState {

    private done = false;

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       private dashSound: SoundEffect,
                       sharedStateVariables: SharedHeroStateVariables) {
        super(hero, physicsComponent, spawnProjectile, sharedStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {

        if (!this.done) {
            this.sharedStateVariables.timeSinceLastDash = 0;
            this.sharedStateVariables.dashAvailable = false;
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

export class StompState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       private stompSound: SoundEffect,
                       sharedStateVariables: SharedHeroStateVariables,
                       private landSound: SoundEffect) {
        super(hero, physicsComponent, spawnProjectile, sharedStateVariables);
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

export class AfterStompState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       sharedStateVariables: SharedHeroStateVariables
    ) {
        super(hero, physicsComponent, spawnProjectile, sharedStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {

        this.physicsComponent.AddToExternalForce(vec3.fromValues(0, -0.10, 0));
        await this.hero.ChangeState(this.hero.IDLE_STATE());
    }

    public async Enter(): Promise<void> {
        return Promise.resolve(undefined);
    }

    public async Exit(): Promise<void> {
        return Promise.resolve(undefined);
    }

}

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
                       sharedStateVariables: SharedHeroStateVariables) {
        super(hero, physicsComponent, spawnProjectile, sharedStateVariables);
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

export class WalkState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       private animation: Animation,
                       physicsComponent: PhysicsComponent,
                       private walkSound: SoundEffect,
                       sharedStateVariables: SharedHeroStateVariables) {
        super(hero, physicsComponent, spawnProjectile, sharedStateVariables);
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
            if (this.sharedStateVariables.timeSinceLastDash > 300) {
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

export class DeadState implements IState {

    private timeLeftInDeadState = 3000;
    private dirOnDeath: vec3 = vec3.create();

    public constructor(private hero: Hero,
                       private onDeath: () => void,
                       private dieSound: SoundEffect,
                       private sharedStateVariables: { bbSize: vec2, bbOffset: vec3, rotation: number },
                       private animation: Animation) {
    }

    public async Enter(): Promise<void> {
                await this.dieSound.Play();
                await this.animation.Stop();
    }

    public async Exit(): Promise<void> {
        await this.animation.Start();
    }

    public async Update(delta: number): Promise<void> {

        this.timeLeftInDeadState -= delta;
        if (this.timeLeftInDeadState <= 0) {
            this.onDeath();
        }
        this.dirOnDeath = vec3.clone(this.hero.FacingDirection);
        this.sharedStateVariables.bbSize = vec2.fromValues(this.sharedStateVariables.bbSize[1], this.sharedStateVariables.bbSize[0]);

        // This is only kind-of correct, but im already in dead state so who cares if the bb is not correctly aligned.
        // The only important thing is not to fall through the geometry...
        this.sharedStateVariables.bbOffset[1] = this.dirOnDeath[0] > 0 ?
            1.5 - this.sharedStateVariables.bbOffset[1] : 1.5 - this.sharedStateVariables.bbOffset[1];
        this.sharedStateVariables.rotation = this.dirOnDeath[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
    }

}
