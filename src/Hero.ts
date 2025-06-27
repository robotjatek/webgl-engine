import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { SoundEffectPool } from './SoundEffectPool';
import { SlimeEnemy } from './Enemies/SlimeEnemy';
import { IProjectile } from './Projectiles/IProjectile';
import { DragonEnemy } from './Enemies/Dragon/DragonEnemy';
import { Spike } from './Enemies/Spike';
import { Cactus } from './Enemies/Cactus';
import { HealthPickup } from './Pickups/HealthPickup';
import { CoinObject } from './Pickups/CoinObject';
import { IGameobject } from './IGameobject';
import { SoundEffect } from './SoundEffect';
import { KeyHandler } from './KeyHandler';
import { ControllerHandler } from './ControllerHandler';
import { XBoxControllerKeys } from './XBoxControllerKeys';
import { Keys } from './Keys';
import { MeleeAttack } from './Projectiles/MeleeAttack';
import { IDisposable } from './IDisposable';
import { SpriteRenderer } from './SpriteRenderer';
import { Environment } from './Environment';
import { Animation } from './Components/Animation';
import { PhysicsComponent } from './Components/PhysicsComponent';

enum State {
    IDLE = 'idle',
    WALK = 'walk',
    DEAD = 'dead',
    STOMP = 'stomp',
    JUMP = 'jump',
    DASH = 'dash',
}

enum AnimationStates {
    IDLE,
    WALKING
}

export class Hero implements IDisposable {
    private health: number = 100;
    private collectedCoins: number = 0;
    private state: State = State.IDLE;

    private readonly sprite: Sprite;
    private readonly renderer: SpriteRenderer;
    private readonly bbRenderer: SpriteRenderer;
    private readonly physicsComponent: PhysicsComponent;

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);

    private lastPosition: vec3 = vec3.fromValues(0, 0, 1);
    private acceptInput: boolean = true;

    private animationState: AnimationStates = AnimationStates.IDLE;
    private readonly animation: Animation;
    private leftFacingAnimationFrames = [
        vec2.fromValues(0.0 / 12.0, 3.0 / 8.0),
        vec2.fromValues(1.0 / 12.0, 3.0 / 8.0),
        vec2.fromValues(2.0 / 12.0, 3.0 / 8.0)
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(0.0 / 12.0, 1.0 / 8.0),
        vec2.fromValues(1.0 / 12.0, 1.0 / 8.0),
        vec2.fromValues(2.0 / 12.0, 1.0 / 8.0)
    ];
    private currentFrameSet = this.rightFacingAnimationFrames;

    // TODO: http://www.davetech.co.uk/gamedevplatformer
    // TODO: buffer jump
    // TODO: coyote time -- can jump for little time after falling
    // TODO: variable jump height

    // TODO: longer range but much slower attack
    // TODO: make bb variables parametrizable
    // TODO: double jump
    // TODO: ECS system
    // TODO: state machines
    private bbOffset = vec3.fromValues(1.2, 1.1, 0);
    private bbSize = vec2.fromValues(0.8, 1.8);
    private wasInAir: boolean = false;
    private remainingJumpTime: number = 0;
    private isJumping: boolean = false;
    private invincible: boolean = false;
    private invincibleTime: number = 0;
    private dirOnDeath: vec3 = vec3.create();
    private rotation: number = 0;
    private timeSinceLastStomp: number = 9999;
    private timeSinceLastDash: number = 0;
    private dashAvailable = true;
    private timeSinceLastMeleeAttack = 0;
    private timeInOverHeal = 0;
    private timeLeftInDeadState: number = 3000;
    private pushbackForce = vec3.create();
    private isDamaged: boolean = false;

    public get BoundingBox(): BoundingBox {
        if (this.state !== State.STOMP) {
            const bbPosition = vec3.add(vec3.create(), this.position, this.bbOffset);
            return new BoundingBox(bbPosition, this.bbSize);
        } else {
            const bbPosition = vec3.add(vec3.create(), this.position, vec3.fromValues(0.75, 1.0, 0));
            return new BoundingBox(bbPosition, vec2.fromValues(1.5, 2));
        }
    }

    public get CollectedCoins(): number {
        return this.collectedCoins;
    }

    public get Health(): number {
        return this.health;
    }

    public set Health(value: number) {
        this.health = value;
        if (this.health < 0) {
            this.health = 0;
        }
    }

    public set AcceptInput(value: boolean) {
        this.acceptInput = value;
    }

    private lastFacingDirection: vec3 = vec3.fromValues(1, 0, 0);

    public get FacingDirection(): vec3 {
        return this.lastFacingDirection;
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get CenterPosition(): vec3 {
        return vec3.fromValues(
            this.position[0] + this.visualScale[0] / 2,
            this.position[1] + this.visualScale[1] / 2,
            0);
    }

    private constructor(
        private position: vec3,
        private visualScale: vec2,
        private collider: ICollider,
        private onDeath: () => void,
        private SpawnProjectile: (sender: Hero, projectile: IProjectile) => void,
        private shader: Shader,
        private bbShader: Shader,
        private jumpSound: SoundEffect,
        private landSound: SoundEffect,
        private walkSound: SoundEffect,
        private stompSound: SoundEffect,
        private damageSound: SoundEffect,
        private dieSound: SoundEffect,
        private texture: Texture,
        private keyHandler: KeyHandler,
        private gamepadHandler: ControllerHandler
    ) {
        this.sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            // TODO: parametrize tex coords
            Utils.CreateTextureCoordinates( // texture-offset is added to these coordinates, so it must be (0,0)
                0.0 / 12.0, // These constants are hardcoded with "hero1.png" in mind
                0.0 / 8.0,
                1.0 / 12.0,
                1.0 / 8.0
            )
        );

        this.renderer = new SpriteRenderer(shader, texture, this.sprite, visualScale);
        this.renderer.TextureOffset = this.currentFrameSet[0];
        this.animation = new Animation(1 / 60 * 8 * 1000, this.renderer);

        this.bbRenderer = new SpriteRenderer(bbShader, null, this.bbSprite, this.bbSize);
        this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));

        this.physicsComponent = new PhysicsComponent(position, this.lastPosition, () => this.BoundingBox, this.bbOffset, collider, false, false);
    }

    public static async Create(
        position: vec3, visualScale: vec2, collider: ICollider, onDeath: () => void,
        spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
        keyHandler: KeyHandler, gamepadHandler: ControllerHandler): Promise<Hero> {

        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');

        const jumpSound = await SoundEffectPool.GetInstance().GetAudio('audio/jump.wav');
        const landSound = await SoundEffectPool.GetInstance().GetAudio('audio/land.wav', false);
        const walkSound = await SoundEffectPool.GetInstance().GetAudio('audio/walk1.wav', false);
        const stompSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_stomp.wav', true);
        const damageSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_damage.wav');
        const dieSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_die.wav', false);
        const texture = await TexturePool.GetInstance().GetTexture('textures/hero1.png');

        return new Hero(position, visualScale, collider, onDeath, spawnProjectile,
            shader, bbShader, jumpSound, landSound, walkSound, stompSound, damageSound, dieSound, texture,
            keyHandler, gamepadHandler);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, this.rotation);

        // Draw bounding box
        if (Environment.RenderBoundingBoxes) {
            this.bbRenderer.Draw(proj, view, this.BoundingBox.position, this.rotation);
        }
    }

    public async Update(delta: number): Promise<void> {
        if (this.state !== State.DEAD) {
            this.Animate(delta);
            this.SetWalkingState();
            this.CalculateFacingDirection();
            this.SetAnimationByFacingDirection();

            await this.PlayWalkSounds();
            await this.HandleLanding();
            this.DisableInvincibleStateAfter(delta, 15); // ~15 frame (1/60*1000*15)
            await this.HandleDeath();

            // Slowly drain health when overhealed
            if (this.Health > 100) {
                this.timeInOverHeal += delta;
            }
            if (this.timeInOverHeal > 1000) {
                this.timeInOverHeal = 0;
                this.Health--;
            }

            if (this.state !== State.STOMP) {
                this.timeSinceLastStomp += delta;
            }

            this.timeSinceLastDash += delta;
            this.timeSinceLastMeleeAttack += delta;

            // TODO: on exit dash state
            if (this.state === State.DASH && this.timeSinceLastDash > 300) {
                this.state = State.WALK;
                this.physicsComponent.EnableGravity();
                // BUG: nem mindig kapcsol vissza a gravity
            }

            if (this.isJumping && this.remainingJumpTime > 0) {
                const force = vec3.fromValues(0, -0.013, 0);
                this._jump(delta, force);
            }

            if (this.isDamaged && this.remainingJumpTime > 0) {
                this._jump(delta, this.pushbackForce);
            } else {
                this.isDamaged = false;
            }

            if (this.invincible) {
                this.invincibleTime += delta;
            }
        } else if (this.state === State.DEAD) {
            this.timeLeftInDeadState -= delta;
            if (this.timeLeftInDeadState <= 0) {
                this.onDeath();
                this.timeLeftInDeadState = 3000;
            }

            this.RotateSprite(this.dirOnDeath);
        }

        await this.physicsComponent.Update(delta);
        await this.HandleInput(delta);
    }

    private _jump(delta: number, force: vec3): void {
        const jDelta = Math.min(this.remainingJumpTime, delta);
        this.physicsComponent.AddToExternalForce(force);
        this.remainingJumpTime -= jDelta;

        if (this.remainingJumpTime <= 0 && this.physicsComponent.OnGround) {
            this.isJumping = false;
        }
    }

    private RotateSprite(directionOnDeath: vec3): void {
        this.rotation = directionOnDeath[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
    }

    private CalculateFacingDirection() {
        const dir = vec3.sub(vec3.create(), this.position, this.lastPosition);
        if (dir[0] < 0) {
            vec3.set(this.lastFacingDirection, -1, 0, 0);
        } else if (dir[0] > 0) {
            vec3.set(this.lastFacingDirection, 1, 0, 0);
        }
    }

    private async HandleInput(delta: number): Promise<void> {
        if (this.acceptInput) {
            if (this.keyHandler.IsPressed(Keys.A) ||
                this.keyHandler.IsPressed(Keys.LEFT_ARROW) ||
                this.gamepadHandler.LeftStick[0] < -0.5 ||
                this.gamepadHandler.IsPressed(XBoxControllerKeys.LEFT)) {
                this.Move(vec3.fromValues(-0.0002, 0, 0), delta);
            } else if (this.keyHandler.IsPressed(Keys.D) ||
                this.keyHandler.IsPressed(Keys.RIGHT_ARROW) ||
                this.gamepadHandler.LeftStick[0] > 0.5 ||
                this.gamepadHandler.IsPressed(XBoxControllerKeys.RIGHT)) {
                this.Move(vec3.fromValues(0.0002, 0, 0), delta);
            }

            if (this.keyHandler.IsPressed(Keys.SPACE) ||
                this.keyHandler.IsPressed(Keys.UP_ARROW) ||
                this.keyHandler.IsPressed(Keys.W) ||
                this.gamepadHandler.IsPressed(XBoxControllerKeys.A)) {
                await this.Jump();
            }

            if (this.keyHandler.IsPressed(Keys.S) ||
                this.keyHandler.IsPressed(Keys.DOWN_ARROW) ||
                this.gamepadHandler.LeftStick[1] > 0.8 ||
                this.gamepadHandler.IsPressed(XBoxControllerKeys.DOWN)) {
                await this.Stomp();
            }

            if (this.keyHandler.IsPressed(Keys.LEFT_SHIFT) || this.gamepadHandler.IsPressed(XBoxControllerKeys.RB)) {
                await this.Dash();
            }

            if (this.keyHandler.IsPressed(Keys.E) || this.gamepadHandler.IsPressed(XBoxControllerKeys.X) ||
                this.keyHandler.IsPressed(Keys.LEFT_CONTROL) || this.keyHandler.IsPressed(Keys.RIGHT_SHIFT)) {
                const attackPosition = this.AttackSpawnPosition;
                this.Attack(async () => {
                    // TODO: creating an attack instance on every attack is wasteful.
                    this.SpawnProjectile(this, await MeleeAttack.Create(attackPosition, this.FacingDirection));
                });
            }
        }
    }

    private get AttackSpawnPosition(): vec3 {
        return this.FacingDirection[0] > 0 ?
            vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(0, -1, 0)) :
            vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(-4, -1, 0));
    }

    private async HandleDeath(): Promise<void> {
        if (this.Health <= 0) {
            this.state = State.DEAD;
            await this.dieSound.Play();
            vec3.subtract(this.dirOnDeath, this.position, this.lastPosition);
            this.bbSize = vec2.fromValues(this.bbSize[1], this.bbSize[0]);
            // This is only kind-of correct, but im already in dead state so who cares if the bb is not correctly aligned.
            // The only important thing is not to fall through the geometry...
            this.bbOffset[0] = this.dirOnDeath[0] > 0 ? this.bbOffset[0] : 1.5 - this.bbOffset[0];
        }
    }

    private DisableInvincibleStateAfter(delta: number, numberOfFrames: number): void {
        if (this.invincibleTime > 1.0 / 60 * 1000 * numberOfFrames) {
            this.invincible = false;
            this.invincibleTime = 0;
            this.shader.SetVec4Uniform('colorOverlay', vec4.create());
        }
        this.invincible ? this.invincibleTime += delta : this.invincibleTime = 0;
    }

    private Animate(delta: number): void {
        if (this.animationState !== AnimationStates.IDLE) {
            this.animation.Animate(delta, this.currentFrameSet);
        }
    }

    private SetWalkingState(): void {
        const distanceFromLastPosition = vec3.distance(this.lastPosition, this.position);
        if (distanceFromLastPosition > 0.001) {
            this.animationState = AnimationStates.WALKING;
        } else {
            this.animationState = AnimationStates.IDLE;
        }
    }

    private SetAnimationByFacingDirection(): void {
        if (this.FacingDirection[0] < 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
        } else if (this.FacingDirection[0] > 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
        }
    }

    private async PlayWalkSounds(): Promise<void> {
        if (this.state === State.WALK &&
            vec3.distance(this.position, this.lastPosition) > 0.0005
            && this.physicsComponent.OnGround) {
            await this.walkSound.Play(1.8, 0.8);
        }

        if (this.state === State.IDLE) {
            this.walkSound.Stop();
        }
    }

    private async HandleLanding(): Promise<void> {
        const wasStomping = this.state === State.STOMP;

        if (this.physicsComponent.OnGround) {
            if ((this.wasInAir || wasStomping) &&
                vec3.squaredLength(this.physicsComponent.Velocity) < 0.00001) {
                this.state = State.IDLE;
                this.wasInAir = false;
                this.dashAvailable = true;
                this.isJumping = false;

                if (!wasStomping) {
                    await this.landSound.Play(1.8, 0.5);
                }
            }
        } else {
            this.wasInAir = true;
        }
    }

    // TODO: gradual acceleration
    public Move(direction: vec3, delta: number): void {
        if (this.state !== State.DEAD && this.state !== State.STOMP && this.state !== State.DASH && !this.isDamaged) {
            this.state = State.WALK; // TODO: animáció állapotok
            this.physicsComponent.AddToExternalForce(vec3.scale(vec3.create(), direction, delta));
        }
    }

    // TODO: gradual jump height
    private async Jump(): Promise<void> {
        // TODO: all these dead checks are getting ridiculous. Something really needs to be done...
        if (this.state !== State.JUMP && this.physicsComponent.OnGround && this.state !== State.DEAD) {
            this.remainingJumpTime = 150;
            await this.jumpSound.Play();
            this.state = State.JUMP;
            this.isJumping = true;
        }
    }

    private async Stomp(): Promise<void> {
        if (!this.physicsComponent.OnGround && this.state !== State.DEAD && this.state !== State.STOMP && this.timeSinceLastStomp > 480) {
            this.state = State.STOMP;
            this.physicsComponent.AddToExternalForce(vec3.fromValues(0, 0.02,0));
            this.invincible = true;
            this.timeSinceLastStomp = 0;
            const pitch = 0.8 + Math.random() * (1.25 - 0.8);
            await this.stompSound.Play(pitch);
        }
    }

    // TODO: enter dash state (state machine)
    private async Dash(): Promise<void> {
        if (this.state !== State.DEAD
        && this.state !== State.IDLE
        && this.timeSinceLastDash > 300
        && this.state !== State.STOMP
        && this.dashAvailable) {

            this.state = State.DASH;
            this.timeSinceLastDash = 0;
            this.dashAvailable = false;

            // TODO: dash enter state => disable gravity, disable input
            // TODO: dash exit => enable gravity, enable input
            // quick burst momentum
            this.physicsComponent.ResetVerticalVelocity();
            this.physicsComponent.DisableGravity();
            this.physicsComponent.AddToExternalForce(vec3.fromValues(0.08 * this.FacingDirection[0], 0, 0));

            const pitch = 0.8 + Math.random() * (1.25 - 0.8);
            await this.stompSound.Play(pitch);
        }
    }

    private Attack(afterAttack: () => void): void {
        // TODO: yet another magic number
        if (this.state !== State.DEAD && this.timeSinceLastMeleeAttack > 350) {
            this.timeSinceLastMeleeAttack = 0;
            if (afterAttack) {
                afterAttack();
            }
        }
    }

    public async CollideWithGameObject(object: IGameobject): Promise<void> {
        await object.Visit(this);
    }

    public async InteractWithProjectile(projectile: IProjectile): Promise<void> {
        if (!projectile.AlreadyHit && this.state !== State.DEAD) {
            const pushbackForce = projectile.PushbackForce;
            await this.Damage(pushbackForce, 20);
            await projectile.OnHit();
        }
    }

    public CollideWithHealth(healthPickup: HealthPickup): void {
        this.Health += healthPickup.Increase;
    }

    public CollideWithCoin(coin: CoinObject): void {
        this.collectedCoins++;
    }

    public async CollideWithDragon(enemy: DragonEnemy): Promise<void> {
        if (this.state === State.STOMP) {
            this.physicsComponent.AddToExternalForce(vec3.fromValues(0, -0.05, 0));
            this.state = State.JUMP;
            await enemy.Damage(vec3.create()); // Damage the enemy without pushing it to any direction
        }
    }

    // TODO: kicsit soknak tűnik a stomp körüli interakció kezelés duplikációja
    public async CollideWithSlime(enemy: SlimeEnemy): Promise<void> {
        if (this.state !== State.STOMP) {
            const pushbackForceRatio = vec3.fromValues(this.FacingDirection[0] * -0.0075, -0.003, 0);
            await this.DamageWithInvincibilityConsidered(pushbackForceRatio, 34);
        } else if (this.state === State.STOMP) {
            this.physicsComponent.AddToExternalForce(vec3.fromValues(0, -0.05, 0));
            this.state = State.JUMP;
            await enemy.Damage(vec3.create()); // Damage the enemy without pushing it to any direction
        }
    }

    public async CollideWithSpike(enemy: Spike): Promise<void> {
        if (!this.invincible) {
            await this.Damage(vec3.fromValues(0, -0.025, 0), 20);
        }
    }

    public async CollideWithCactus(enemy: Cactus): Promise<void> {
        if (this.state !== State.STOMP) {
            const pushbackForceRatio = vec3.fromValues(this.FacingDirection[0] * -0.0075, -0.005, 0);
            await this.DamageWithInvincibilityConsidered(pushbackForceRatio, 20);
        } else { // cactus will hurt the hero when stomping on it
            await this.Damage(vec3.fromValues(0, -0.025, 0), 20);
            this.state = State.JUMP;
        }
    }

    public async DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void> {
        if (!this.invincible) {
            await this.Damage(pushbackForce, damage);
        }
    }

    private async Damage(pushbackForce: vec3, damage: number): Promise<void> {
        // TODO: This is almost a 1:1 copy from the Collide method
        // Damage method should not consider the invincible flag because I don't want to cancel damage with projectiles when stomping
        if (this.state !== State.DEAD) {
            this.invincible = true;
            this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
            await this.damageSound.Play();
            this.Health -= damage;
            this.isDamaged = true;
            this.pushbackForce = vec3.clone(pushbackForce);
            this.remainingJumpTime = 150; // TODO: külön változó?
        }
    }

    public Kill(): void {
        if (this.state !== State.DEAD) {
            this.Health = 0;
        }
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.bbRenderer.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }
}
