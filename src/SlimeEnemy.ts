import { ICollider } from './ICollider';
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Sprite } from './Sprite';
import { Utils } from './Utils';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { BoundingBox } from './BoundingBox';
import { SoundEffectPool } from './SoundEffectPool';

// TODO: enemy has a movement path

// TODO: spike enemy: stationary enemy, cannot be damaged
// TODO: dragon enemy: can shoot projectiles
// TODO: enemy follows the player
// TODO: enemy attacks the player
export class SlimeEnemy implements ICollider {
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private velocity: vec3 = vec3.fromValues(0, 0, 0);
    private lastPosition: vec3;
    private shader: Shader = new Shader('shaders/VertexShader.vert', 'shaders/Hero.frag');
    private texture: Texture = TexturePool.GetInstance().GetTexture('monster1.png');
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            0.0 / 12.0, // These constants are hardcoded with "monster1.png" in mind
            0.0 / 8.0,
            1.0 / 12.0,
            1.0 / 8.0
        ));
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);
    private health = 3;
    private enemyDamageSound = SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
    private enemyDeathSound = SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
    private damagedTime = 0;
    private damaged = false;

    private bbOffset = vec3.fromValues(1.2, 1.8, 0);
    private bbSize = vec2.fromValues(0.8, 1.0);
    private bbShader = new Shader('shaders/VertexShader.vert', 'shaders/Colored.frag');
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], this.texture);

    public constructor(
        private position: vec3,
        private visualScale: vec2,
        private collider: ICollider,
        private onDeath: (sender: SlimeEnemy) => void
    ) {
        this.lastPosition = vec3.create();
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public IsCollidingWidth(boundingBox: BoundingBox): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    public Damage() {
        this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.bbSize[0], this.bbSize[1], 1));
    }

    public Update(delta: number): void {
        this.Animate(delta);
        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);

        vec3.copy(this.lastPosition, this.position);
        this.ApplyGravityToVelocity(delta);
        this.ApplyVelocityToPosition(delta);
        this.HandleCollisionWithCollider();
    }

    private RemoveDamageOverlayAfter(delta: number, showOverlayTime: number) {
        if (this.damaged) {
            this.damagedTime += delta;
        }

        if (this.damagedTime > showOverlayTime) {
            this.damagedTime = 0;
            this.damaged = false;
            this.shader.SetVec4Uniform('colorOverlay', vec4.create());
        }
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 264) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 2) {
                this.currentAnimationFrame = 0;
            }

            this.sprite.textureOffset = vec2.fromValues(this.currentAnimationFrame / 12.0, 2 / 8.0);
            this.currentFrameTime = 0;
        }
    }

    // TODO: should make this a component system
    private ApplyGravityToVelocity(delta: number): void {
        const gravity = vec3.fromValues(0, 0.00004, 0);
        vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), gravity, delta));
    }

    // TODO: make this a component system
    private ApplyVelocityToPosition(delta: number) {
        const moveValue = vec3.create();
        vec3.scale(moveValue, this.velocity, delta);
        vec3.add(this.position, this.position, moveValue);
    }


    // TODO: how to make this a component?
    private HandleCollisionWithCollider() {
        const colliding = this.collider.IsCollidingWidth(this.BoundingBox);
        if (colliding) {
            vec3.copy(this.position, this.lastPosition);
            this.velocity = vec3.create();
        }
    }
}