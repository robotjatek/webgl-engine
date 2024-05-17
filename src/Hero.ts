import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { SoundEffectPool } from './SoundEffectPool';
import { SlimeEnemy } from './Enemies/SlimeEnemy';
import { IProjectile } from './Projectiles/IProjectile';
import { DragonEnemy } from './Enemies/DragonEnemy';
import { IEnemy } from './Enemies/IEnemy';
import { Spike } from './Enemies/Spike';
import { Cactus } from './Enemies/Cactus';
import { HealthPickup } from './Pickups/HealthPickup';
import { CoinObject } from './Pickups/CoinObject';
import { IPickup } from './Pickups/IPickup';
import { SoundEffect } from './SoundEffect';
import { KeyHandler } from './KeyHandler';
import { ControllerHandler } from './ControllerHandler';
import { XBoxControllerKeys } from './XBoxControllerKeys';
import { Keys } from './Keys';
import { MeleeAttack } from './Projectiles/MeleeAttack';

enum State {
  IDLE = 'idle',
  WALK = 'walk',
  DEAD = 'dead',
  STOMP = 'stomp',
  JUMP = 'jump',
  DASH = 'dash'
}

export class Hero {
  private health: number = 100;
  private collectedCoins: number = 0;
  private state: State = State.IDLE;
  private currentFrameTime = 0;
  private currentAnimationFrame = 0;
  private sprite: Sprite;
  private batch: SpriteBatch;
  private lastPosition: vec3 = vec3.fromValues(0, 0, 1);
  private velocity: vec3 = vec3.fromValues(0, 0, 0);

  // TODO: BUG: Hero sometimes spawns its attack projectile in the wrong direction
  // TODO: longer range but much slower attack
  // TODO: make bb variables parametrizable
  // TODO: double jump
  // TODO: ECS system
  // TODO: state machines
  private bbOffset = vec3.fromValues(1.2, 1.1, 0);
  private bbSize = vec2.fromValues(0.8, 1.8);
  private jumping: boolean = false;
  private onGround: boolean = true;
  private wasInAir: boolean = false;
  private invincible: boolean = false;
  private invincibleTime: number = 0;
  private dirOnDeath: vec3;
  private timeSinceLastStomp: number = 0;
  private timeSinceLastDash: number = 0;
  private dashAvailable = true;
  private timeSinceLastMeleeAttack = 0;
  private timeInOverHeal = 0;

  private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
  private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

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

  private set Health(value: number) {
    this.health = value;
    if (this.health < 0) {
      this.health = 0;
    }
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
    private spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
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
    this.sprite.textureOffset = vec2.fromValues(1 / 12.0, 1 / 8.0);

    this.batch = new SpriteBatch(
      this.shader,
      [this.sprite],
      this.texture
    );
    // this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 1));
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

    const hero = new Hero(position, visualScale, collider, onDeath, spawnProjectile, shader,
      bbShader, jumpSound, landSound, walkSound, stompSound, damageSound, dieSound, texture,
      keyHandler, gamepadHandler);

    return hero;
  }

  public Draw(proj: mat4, view: mat4): void {
    this.batch.Draw(proj, view);
    const modelMat = mat4.create();

    if (this.state === State.DEAD) {
      this.RotateSprite(modelMat, this.dirOnDeath);
    }

    mat4.translate(modelMat, modelMat, this.position);
    mat4.scale(
      modelMat,
      modelMat,
      vec3.fromValues(this.visualScale[0], this.visualScale[1], 1)
    );

    this.batch.ModelMatrix = modelMat;

    // Draw bounding box
    this.bbBatch.Draw(proj, view);
    mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
    mat4.scale(this.bbBatch.ModelMatrix,
      this.bbBatch.ModelMatrix,
      vec3.fromValues(this.BoundingBox.size[0], this.BoundingBox.size[1], 1));
  }

  private RotateSprite(modelMat: mat4, directionOnDeath: vec3) {
    const centerX = this.position[0] + this.visualScale[0] * 0.5;
    const centerY = this.position[1] + this.visualScale[1] * 0.5;

    mat4.translate(modelMat, modelMat, vec3.fromValues(centerX, centerY, 0));
    mat4.rotateZ(modelMat, modelMat, directionOnDeath[0] > 0 ? -Math.PI / 2 : Math.PI / 2);
    mat4.translate(modelMat, modelMat, vec3.fromValues(-centerX, -centerY, 0));
  }

  public Update(delta: number) {
    if (this.state !== State.DEAD) {
      this.Animate(delta);
      this.PlayWalkSounds();
      this.HandleLanding();
      this.DisableInvincibleStateAfter(delta, 15); // ~15 frame (1/60*1000*15)
      this.HandleDeath();

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

      if (this.state === State.DASH && this.timeSinceLastDash > 300) {
        this.state = State.WALK;
      }

      if (this.invincible) {
        this.invincibleTime += delta;
      }
    }

    const dir = vec3.subtract(vec3.create(), this.position, this.lastPosition);
    if (dir[0]) {
      this.lastFacingDirection = dir;
    }
    vec3.copy(this.lastPosition, this.position);
    this.ApplyGravityToVelocity(delta);
    this.ReduceHorizontalVelocityWhenDashing();
    this.ApplyVelocityToPosition(delta);
    this.HandleCollisionWithCollider();
    this.HandleInput(delta);
  }

  private HandleInput(delta: number): void {
    if (this.keyHandler.IsPressed(Keys.A) ||
      this.gamepadHandler.LeftStick[0] < -0.5 ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.LEFT)) {
      this.MoveLeft(0.01, delta);
    } else if (this.keyHandler.IsPressed(Keys.D) ||
      this.gamepadHandler.LeftStick[0] > 0.5 ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.RIGHT)) {
      this.MoveRight(0.01, delta);
    }

    if (this.keyHandler.IsPressed(Keys.SPACE) ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.A)) {
      this.Jump();
    }

    if (this.keyHandler.IsPressed(Keys.S) ||
      this.gamepadHandler.LeftStick[1] > 0.8 ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.DOWN)) {
      this.Stomp();
    }

    if (this.keyHandler.IsPressed(Keys.LEFT_SHIFT) || this.gamepadHandler.IsPressed(XBoxControllerKeys.RB)) {
      this.Dash();
    }

    if (this.keyHandler.IsPressed(Keys.E) || this.gamepadHandler.IsPressed(XBoxControllerKeys.X)) {
      const attackPosition = this.FacingDirection[0] > 0 ?
        vec3.add(vec3.create(), this.Position, vec3.fromValues(1.5, 0, 0)) :
        vec3.add(vec3.create(), this.Position, vec3.fromValues(-2.5, 0, 0));
      this.Attack(async () => {
        // TODO: creating an attack instance on every attack is wasteful.
        // TODO: I need to dispose resources after attack is done
        this.spawnProjectile(this, await MeleeAttack.Create(attackPosition, this.FacingDirection));
      });
    }
  }

  private HandleDeath(): void {
    if (this.Health <= 0) {
      this.state = State.DEAD;
      this.dieSound.Play();
      const dir = vec3.create();
      vec3.subtract(dir, this.position, this.lastPosition);
      this.dirOnDeath = dir;

      this.bbSize = vec2.fromValues(this.bbSize[1], this.bbSize[0]);
      // This is only kind-of correct, but im already in dead state so who cares if the bb is not correctly aligned.
      // The only important thing is not to fall through the geometry...
      this.bbOffset[0] = dir[0] > 0 ? this.bbOffset[0] : 1.5 - this.bbOffset[0];

      setTimeout(this.onDeath, 3000);
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

  private HandleCollisionWithCollider(): void {
    const colliding = this.collider.IsCollidingWidth(this.BoundingBox, true);
    if (colliding) {
      vec3.copy(this.position, this.lastPosition);
      this.velocity = vec3.create();
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  private ApplyVelocityToPosition(delta: number): void {
    const moveValue = vec3.create();
    vec3.scale(moveValue, this.velocity, delta);
    vec3.add(this.position, this.position, moveValue);
  }

  private ApplyGravityToVelocity(delta: number): void {
    if (this.state !== State.DASH) {
      const gravity = vec3.fromValues(0, 0.00004, 0);
      vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), gravity, delta));
    }
  }

  private ReduceHorizontalVelocityWhenDashing(): void {
    if (!this.dashAvailable)
      this.velocity[0] *= 0.75;
  }

  private Animate(delta: number): void {
    this.currentFrameTime += delta;
    if (this.currentFrameTime > 132) {
      if (this.state === State.WALK) {
        const dir = vec3.create();
        vec3.subtract(dir, this.position, this.lastPosition);
        if (vec3.squaredLength(dir) > 0) {
          this.sprite.textureOffset = this.calculateTextureOffset(vec2.fromValues(dir[0], dir[1]));
        } else {
          // same position as last frame, so it is considered idle
          this.state = State.IDLE;
          // Reset back to the idle frame of the last movement direction
          // Now it is completly dependent on the currently used texture
          // TODO: create a texture independent configuration for animation states
          this.sprite.textureOffset = vec2.fromValues(1 / 12.0, this.sprite.textureOffset[1]);
        }
      }
    }
  }

  private PlayWalkSounds(): void {
    if (this.state === State.WALK && this.position !== this.lastPosition && !this.jumping && this.onGround) {
      this.walkSound.Play(1.8, 0.8);
    }

    if (this.state === State.IDLE) {
      this.walkSound.Stop();
    }
  }

  private HandleLanding(): void {
    const isOnGround = this.velocity[1] === 0 && !this.jumping;
    if (this.wasInAir && isOnGround) {
      this.landSound.Play(1.8, 0.5);
      this.dashAvailable = true;
    }
    this.wasInAir = !isOnGround;

    if (this.velocity[1] === 0) {
      this.jumping = false;
      this.state = State.IDLE;
    }
  }

  // TODO: move left, and move right should a change the velocity not the position itself
  private MoveRight(amount: number, delta: number): void {
    if (this.state !== State.DEAD && this.state !== State.STOMP && this.state !== State.DASH) {
      this.state = State.WALK;
      if (!this.invincible) {
        const nextPosition = vec3.fromValues(this.position[0] + amount * delta, this.position[1], this.position[2]);
        if (!this.checkCollision(nextPosition)) {
          this.position = nextPosition;
        }
      }
    }
  }

  private MoveLeft(amount: number, delta: number): void {
    if (this.state !== State.DEAD && this.state !== State.STOMP && this.state !== State.DASH) {
      this.state = State.WALK;

      if (!this.invincible) {
        const nextPosition = vec3.fromValues(this.position[0] - amount * delta, this.position[1], this.position[2]);
        if (!this.checkCollision(nextPosition)) {
          this.position = nextPosition;
        }
      }
    }
  }

  private Jump(): void {
    // TODO: all these dead checks are getting ridiculous. Something really needs to be done...
    if (!this.jumping && this.onGround && this.state !== State.DEAD) {
      this.velocity[1] = -0.02;
      this.jumping = true;
      this.jumpSound.Play();
      this.state = State.JUMP
    }
  }

  private Stomp(): void {
    if (this.jumping && !this.onGround && this.state !== State.DEAD && this.state !== State.STOMP && this.timeSinceLastStomp > 350) {
      this.state = State.STOMP;
      this.velocity[1] = 0.04;
      this.invincible = true;
      this.timeSinceLastStomp = 0;
      this.stompSound.Play();
    }
  }

  private Dash(): void {
    if (this.state !== State.DEAD
      && this.state !== State.IDLE
      && this.timeSinceLastDash > 300
      && this.state !== State.STOMP
      && this.dashAvailable) {
      this.state = State.DASH;
      const dir = vec3.create();
      vec3.subtract(dir, this.position, this.lastPosition);
      this.velocity[0] = 0.7 * dir[0];
      this.velocity[1] = -0.0001; // TODO: yet another little hack to make dash play nicely with collision detection
      this.stompSound.Play();
      this.timeSinceLastDash = 0;
      this.dashAvailable = false;
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

  // TODO: handle collision with other object types?
  public Collide(enemy: IEnemy): void {
    enemy.Visit(this);
  }

  public CollideWithPickup(pickup: IPickup): void {
    pickup.Visit(this);
  }

  public CollideWithHealth(healthPickup: HealthPickup): void {
    this.Health += healthPickup.Increase;
  }

  public CollideWithCoin(coin: CoinObject): void {
    this.collectedCoins++;
  }

  public CollideWithDragon(enemy: DragonEnemy): void {
    // Do nothing
  }

  public CollideWithSlime(enemy: SlimeEnemy): void {
    if (this.state !== State.STOMP) {
      if (!this.invincible) {
        // Damage and pushback hero on collision.
        this.invincible = true;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        this.damageSound.Play();
        this.Health -= 34;

        const dir = vec3.subtract(vec3.create(), this.position, enemy.Position);
        vec3.normalize(dir, dir);
        const damagePushback = vec3.scale(vec3.create(), dir, 0.01);
        // TODO: this is a hack to make sure that the hero is not detected as colliding with the ground, so a pushback can happen
        damagePushback[1] -= 0.01;
        vec3.set(this.velocity, damagePushback[0], damagePushback[1], damagePushback[2]);
      }
    } else if (this.state === State.STOMP) {
      vec3.set(this.velocity, 0, -0.025, 0);
      this.state = State.JUMP;
      this.jumping = true;
      enemy.Damage(vec3.create()); // Damage the enemy without pushing it to any direction
    }
  }

  public CollideWithSpike(enemy: Spike): void {
    const pushback = vec3.fromValues(0, -0.018, 0);
    if (!this.invincible) {
      this.Damage(pushback);
    }
  }

  public CollideWithCactus(enemy: Cactus): void {
    if (this.state !== State.STOMP) {
      const dir = vec3.subtract(vec3.create(), this.position, enemy.Position);
      vec3.normalize(dir, dir);
      const pushback = vec3.scale(vec3.create(), dir, 0.01);
      pushback[1] -= 0.01;
      if (!this.invincible) {
        this.Damage(pushback);
      }
    } else {
      const pushback = vec3.fromValues(0, -0.025, 0);
      this.Damage(pushback);
      this.state = State.JUMP;
      this.jumping = true;
    }
  }

  private Damage(pushbackForce: vec3): void {
    // TODO: This is almost a 1:1 copy from the Collide method

    // Damage method should not consider the invincible flag because I dont want to cancel damage with projectiles when stomping
    if (this.state !== State.DEAD) {
      this.invincible = true;
      this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
      this.damageSound.Play();
      this.Health -= 34;

      vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);
    }
  }

  public Kill(): void {
    if (this.state !== State.DEAD) {
      this.Health = 0;
    }
  }

  public InteractWithProjectile(projectile: IProjectile): void {
    if (!projectile.AlreadyHit && this.state !== State.DEAD) {
      const pushbackForce = projectile.PushbackForce;
      this.Damage(pushbackForce);
      projectile.OnHit();
    }
  }

  private checkCollision(nextPosition: vec3): boolean {
    const nextBoundingBox = new BoundingBox(vec3.add(vec3.create(), nextPosition, this.bbOffset), this.bbSize);
    return this.collider.IsCollidingWidth(nextBoundingBox, true);
  }

  private calculateTextureOffset(direction: vec2): vec2 {
    if (direction[0] > 0) {
      const offset = vec2.fromValues(this.currentAnimationFrame++ / 12.0, 1.0 / 8.0);
      if (this.currentAnimationFrame === 3) {
        this.currentAnimationFrame = 0;
      }
      this.currentFrameTime = 0;
      return offset;
    } else if (direction[0] < 0) {
      const offset = vec2.fromValues(this.currentAnimationFrame++ / 12.0, 3.0 / 8.0);
      if (this.currentAnimationFrame === 3) {
        this.currentAnimationFrame = 0;
      }
      this.currentFrameTime = 0;
      return offset;
    }

    // Remain in the current animation frame if a correct frame could not be determined
    return this.sprite.textureOffset;
  }
}
