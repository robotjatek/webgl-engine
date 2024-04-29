import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { SpriteBatch } from '../SpriteBatch';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Utils } from '../Utils';
import { ICollider } from '../ICollider';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from './IProjectile';

export class Fireball implements IProjectile {
    public OnHitListeners: ((sender: IProjectile) => void)[] = [];

    private hitSound = SoundEffectPool.GetInstance().GetAudio('audio/hero_stomp.wav');
    private spawnSound = SoundEffectPool.GetInstance().GetAudio('audio/fireball_spawn.mp3');
    private spawnSoundPlayed = false;
    private alreadyHit = false;
    private visualScale = vec2.fromValues(3, 3);

    // Animation related
    private currentFrameTime: number = 0;
    private currentAnimationFrameIndex: number = 0;
    private leftFacingAnimationFrames = [
        vec2.fromValues(0 / 8, 0 / 8),
        vec2.fromValues(1 / 8, 0 / 8),
        vec2.fromValues(2 / 8, 0 / 8),
        vec2.fromValues(3 / 8, 0 / 8),
        vec2.fromValues(4 / 8, 0 / 8),
        vec2.fromValues(5 / 8, 0 / 8),
        vec2.fromValues(6 / 8, 0 / 8),
        vec2.fromValues(7 / 8, 0 / 8),
    ];

    private rightFacingAnimationFrames = [
        vec2.fromValues(0 / 8, 4 / 8),
        vec2.fromValues(1 / 8, 4 / 8),
        vec2.fromValues(2 / 8, 4 / 8),
        vec2.fromValues(3 / 8, 4 / 8),
        vec2.fromValues(4 / 8, 4 / 8),
        vec2.fromValues(5 / 8, 4 / 8),
        vec2.fromValues(6 / 8, 4 / 8),
        vec2.fromValues(7 / 8, 4 / 8),
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;

    // TODO: somehow I need to detect when an object is destroyed, and call a clean up for WebGL resources
    private shader: Shader = new Shader('shaders/VertexShader.vert', 'shaders/Hero.frag');
    private texture: Texture = TexturePool.GetInstance().GetTexture('fireball.png');
    private sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(0, 0, 1 / 8, 1 / 8));

    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    // TODO: altough i dont use bbOffset here I kept all duplicated code nearly the same, to make refactors easier
    private bbOffset = vec3.fromValues(0, 0, 0);
    private bbSize = vec2.fromValues(2.0, 1.0);
    private bbShader = new Shader('shaders/VertexShader.vert', 'shaders/Colored.frag');
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], this.texture);

    public constructor(
        private centerPosition: vec3,
        private moveDirection: vec3,
        private collider: ICollider) {
        this.shader.SetVec4Uniform('clr', vec4.fromValues(0, 1, 0, 0.4));
        this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public get AlreadyHit(): boolean {
        return this.alreadyHit;
    }

    public set AlreadyHit(value: boolean) {
        this.alreadyHit = value;
    }

    public get BoundingBox(): BoundingBox {
        const topLeftCorner = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.bbSize[0] / 2, this.bbSize[1] / 2, 0));
        const bbPos = vec3.add(vec3.create(), topLeftCorner, this.bbOffset); // Adjust bb position with the offset
        return new BoundingBox(bbPos, this.bbSize);
    }

    public Dispose(): void {
        // TODO: Dispose all disposables
        console.error('Hey, you really should dispose this!');
    }

    public Draw(proj: mat4, view: mat4): void {
        const topleft = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.visualScale[0] / 2, this.visualScale[1] / 2, 0));
        mat4.translate(this.batch.ModelMatrix, mat4.create(), topleft);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));
        this.batch.Draw(proj, view);

        // Draw bb
        // mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        // mat4.scale(
        //     this.bbBatch.ModelMatrix,
        //     this.bbBatch.ModelMatrix,
        //     vec3.fromValues(this.BoundingBox.size[0], this.BoundingBox.size[1], 1));
        // this.bbBatch.Draw(proj, view);
    }

    public Update(delta: number): void {
        this.currentFrameSet = this.moveDirection[0] < 0 ?
            this.rightFacingAnimationFrames :
            this.leftFacingAnimationFrames;
        this.Animate(delta);

        if (!this.spawnSoundPlayed) {
            this.spawnSound.Play(1, 0.5);
            this.spawnSoundPlayed = true;
        }
        this.MoveInDirection(delta);
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    /**
     * This function is for to trigger every hit event listeners to fire.
     * Now its only used when checking collision with the hero
     * // TODO: Need a way to rework hero-projectile hit detection.
     */
    public CallHitEventHandlers(): void {
        this.hitSound.Play();
        this.OnHitListeners.forEach(listener => listener(this));
    }

    private MoveInDirection(delta: number): void {
        if (this.moveDirection[0] < 0) {
            this.MoveOnX(0.01, delta);
        } else {
            this.MoveOnX(-0.01, delta);
        }
    }

    private MoveOnX(amount: number, delta: number): void {
        const nextCenterPosition = vec3.fromValues(this.centerPosition[0] + amount * delta, this.centerPosition[1], 0);
        if (!this.CheckCollisionWithCollider(nextCenterPosition)) {
            this.centerPosition = nextCenterPosition;
        } else {
            this.hitSound.Play();
            this.alreadyHit = true;
            this.OnHitListeners.forEach(listener => listener(this));
        }
    }

    // TODO: yet another duplication
    private CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const topleft = vec3.sub(vec3.create(), nextPosition, vec3.fromValues(this.bbSize[0] / 2, this.bbSize[1] / 2, 0));
        const bbPos = vec3.add(vec3.create(), topleft, this.bbOffset);
        const nextBoundingBox = new BoundingBox(bbPos, this.bbSize);
        return this.collider.IsCollidingWidth(nextBoundingBox, false);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;

        // This is ~30 fps animation
        if (this.currentFrameTime >= 16 * 2) {
            this.currentAnimationFrameIndex++;
            if (this.currentAnimationFrameIndex >= this.currentFrameSet.length) {
                this.currentAnimationFrameIndex = 0;
            }

            const currentFrame = this.currentFrameSet[this.currentAnimationFrameIndex];
            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
    }

}
