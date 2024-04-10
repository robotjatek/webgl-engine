import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { SoundEffect } from './SoundEffect';
import { SoundEffectPool } from './SoundEffectPool';
import { SlimeEnemy } from './SlimeEnemy';

enum State {
  IDLE = 'idle',
  WALK = 'walk',
}

export class Hero {
  private state: State = State.IDLE;
  private currentFrameTime = 0;
  private currentAnimationFrame = 0;
  private texture: Texture;
  private sprite: Sprite;
  private batch: SpriteBatch;
  private lastPosition: vec3 = vec3.fromValues(0, 0, 1);
  private velocity: vec3 = vec3.fromValues(0, 0, 0);

  // TODO: make bb variables parametrizable
  // TODO: stomp attack
  // TODO: sword attack
  // TODO: collide with enemy => damage hero
  private bbOffset = vec3.fromValues(1.2, 1.1, 0);
  private bbSize = vec2.fromValues(0.8, 1.8);
  private shader = new Shader('shaders/VertexShader.vert', 'shaders/Hero.frag');
  private jumpSound = SoundEffectPool.GetInstance().GetAudio('audio/jump.wav');
  private landSound = SoundEffectPool.GetInstance().GetAudio('audio/land.wav', false);
  private walkSound = SoundEffectPool.GetInstance().GetAudio('audio/walk1.wav', false);
  private damageSound = SoundEffectPool.GetInstance().GetAudio('audio/hero_damage.wav');
  private jumping: boolean = false;
  private onGround: boolean = true;
  private wasInAir: boolean = false;
  private invincible: boolean = false;
  private invincibleTime: number = 0;

  public get BoundingBox(): BoundingBox {
    return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
  }

  public get Position(): vec3 {
    return this.position;
  }

  constructor(
    private position: vec3,
    private visualScale: vec2,
    private collider: ICollider) {
    this.texture = TexturePool.GetInstance().GetTexture('hero1.png');
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
  }

  public Draw(proj: mat4, view: mat4): void {
    this.batch.Draw(proj, view); // TODO: model matrix here?
    mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
    mat4.scale(
      this.batch.ModelMatrix,
      this.batch.ModelMatrix,
      vec3.fromValues(this.visualScale[0], this.visualScale[1], 1)
    );
  }

  public Update(delta: number) {
    this.Animate(delta);
    this.PlayWalkSounds();
    this.HandleLanding();

    // ~15 frame (1/60*1000*15)
    if (this.invincibleTime > 240) {
      this.invincible = false;
      this.invincibleTime = 0;
      this.shader.SetVec4Uniform('colorOverlay', vec4.create());
    }
    this.invincible ? this.invincibleTime += delta : this.invincibleTime = 0;

    vec3.copy(this.lastPosition, this.position);
    this.ApplyGravityToVelocity(delta);
    this.ApplyVelocityToPosition(delta);
    this.HandleCollisionWithCollider();
  }

  private HandleCollisionWithCollider() {
    const colliding = this.collider.IsCollidingWidth(this.BoundingBox);
    if (colliding) {
      this.state = State.IDLE;
      vec3.copy(this.position, this.lastPosition);
      this.velocity = vec3.create();
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  private ApplyVelocityToPosition(delta: number) {
    const moveValue = vec3.create();
    vec3.scale(moveValue, this.velocity, delta);
    vec3.add(this.position, this.position, moveValue);
  }

  private ApplyGravityToVelocity(delta: number): void {
    const gravity = vec3.fromValues(0, 0.00004, 0);
    vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), gravity, delta));
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
    }
    this.wasInAir = !isOnGround;

    if (this.velocity[1] === 0) {
      this.jumping = false;
    }
  }

  public MoveRight(amount: number, delta: number): void {
    this.state = State.WALK;

    if (!this.invincible) {
      const nextPosition = vec3.fromValues(this.position[0] + amount * delta, this.position[1], this.position[2]);
      if (!this.checkCollision(nextPosition)) {
        this.position = nextPosition;
      }
    }
  }

  public MoveLeft(amount: number, delta: number): void {
    this.state = State.WALK;

    if (!this.invincible) {
      const nextPosition = vec3.fromValues(this.position[0] - amount * delta, this.position[1], this.position[2]);
      if (!this.checkCollision(nextPosition)) {
        this.position = nextPosition;
      }
    }
  }

  public Jump(): void {
    if (!this.jumping && this.onGround) {
      this.velocity[1] = -0.02;
      this.jumping = true;
      this.jumpSound.Play();
    }
  }

  // TODO: make this generic
  // TODO: maybe an interact method
  public Damage(enemy: SlimeEnemy, delta: number): void {
    if (!this.invincible) {
      this.invincible = true;
      this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
      this.damageSound.Play();

      const dir = vec3.subtract(vec3.create(), this.position, enemy.Position);
      vec3.normalize(dir, dir);
      const damagePushback = vec3.scale(vec3.create(), dir, 0.01);
      // TODO: this is a hack to make sure that the hero is not detected as colliding with the ground, so a pushback can happen
      damagePushback[1] -= 0.01;
      vec3.set(this.velocity, damagePushback[0], damagePushback[1], damagePushback[2]);
    } else {
      this.invincibleTime += delta;
    }
  }

  private checkCollision(nextPosition: vec3): boolean {
    const nextBoundingBox = new BoundingBox(vec3.add(vec3.create(), nextPosition, this.bbOffset), this.bbSize);
    return this.collider.IsCollidingWidth(nextBoundingBox);
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
