import { mat4, vec2, vec3 } from 'gl-matrix';
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
  private bbOffset = vec3.fromValues(1.2, 1.1, 0);
  private bbSize = vec2.fromValues(0.8, 1.8);
  private shader = new Shader('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
  private jumpSound = SoundEffectPool.GetInstance().GetAudio('audio/jump.wav');
  private landSound =  new SoundEffect('audio/land.wav', false);
  private walkSound = new SoundEffect('audio/walk1.wav', false); // Sound effect pool does not support singular soundeffects yet
  private jumping: boolean = false;
  private onGround: boolean = true;
  private wasInAir: boolean = false;

  public get BoundingBox(): BoundingBox {
    return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
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

  private ApplyGravityToVelocity(delta: number) {
    const gravity = vec3.fromValues(0, 0.00004, 0);
    vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), gravity, delta));
  }

  private Animate(delta: number) {
    this.currentFrameTime += delta;
    if (this.currentFrameTime > 132) {
      if (this.state == State.WALK) {
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

  private PlayWalkSounds() {
    if (this.state == State.WALK && this.position != this.lastPosition && !this.jumping && this.onGround) {
      this.walkSound.Play(1.8, 0.8);
    }

    if (this.state == State.IDLE) {
      this.walkSound.Stop();
    }
  }

  private HandleLanding() {
    const isOnGround = this.velocity[1] === 0 && !this.jumping;
    if (this.wasInAir && isOnGround) {
      this.landSound.Play(1.8, 0.5);
    }
    this.wasInAir = !isOnGround;

    if (this.velocity[1] === 0) {
      this.jumping = false;
    }
  }

  public MoveRight(delta: number): void {
    this.state = State.WALK;
    const nextPosition = vec3.fromValues(this.position[0] + 0.01 * delta, this.position[1], this.position[2]);
    if (!this.checkCollision(nextPosition)) {
      this.position = nextPosition;
    }
  }

  public MoveLeft(delta: number): void {
    this.state = State.WALK;
    const nextPosition = vec3.fromValues(this.position[0] - 0.01 * delta, this.position[1], this.position[2]);
    if (!this.checkCollision(nextPosition)) {
      this.position = nextPosition;
    }
  }

  public Jump() {
    if (!this.jumping && this.onGround) {
      this.velocity[1] = -0.02;
      this.jumping = true;
      this.jumpSound.Play();
    }
  }

  private checkCollision(nextPosition: vec3): boolean {
    const nextBoundingBox = new BoundingBox(vec3.add(vec3.create(), nextPosition, this.bbOffset), this.bbSize);
    return this.collider.IsCollidingWidth(nextBoundingBox);
  }

  private calculateTextureOffset(direction: vec2): vec2 {
    if (direction[0] > 0) {
      const offset = vec2.fromValues(this.currentAnimationFrame++ / 12.0, 1.0 / 8.0);
      if (this.currentAnimationFrame == 3) {
        this.currentAnimationFrame = 0;
      }
      this.currentFrameTime = 0;
      return offset;
    } else if (direction[0] < 0) {
      const offset = vec2.fromValues(this.currentAnimationFrame++ / 12.0, 3.0 / 8.0);
      if (this.currentAnimationFrame == 3) {
        this.currentAnimationFrame = 0;
      }
      this.currentFrameTime = 0;
      return offset;
    }

    // Remain in the current animation frame if a correct frame could not be determined
    return this.sprite.textureOffset;
  }
}
