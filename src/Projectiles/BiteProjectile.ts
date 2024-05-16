import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { SpriteBatch } from '../SpriteBatch';
import { TexturePool } from '../TexturePool';
import { Utils } from '../Utils';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from './IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { Texture } from 'src/Texture';

/**
 * A stationary projectile that attacks the player
 */
export class BiteProjectile implements IProjectile {
    private alreadyHit = false;
    private animationFinished = false;
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    
    // TODO: flip texure, to achive left and right facing bite attack
    private currentFrameSet: vec2[] = [
        vec2.fromValues(0 / 5, 0 / 2),
        vec2.fromValues(1 / 5, 0 / 2),
        vec2.fromValues(0 / 5, 1 / 2),
        vec2.fromValues(1 / 5, 1 / 2),
    ];

    private bbOffset = vec3.fromValues(0, 0, 0);
    private bbSize = vec2.fromValues(1.6, 1.6);

    private spriteVisualScale = vec3.fromValues(5, 5, 0);

    private sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            0 / 5,
            0 / 2,
            1 / 5,
            1 / 2));
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

    private constructor(
        private centerPosition: vec3,
        private facingDirection: vec3,
        private shader: Shader,
        private bbShader: Shader,
        private biteDamageSound: SoundEffect,
        private texture: Texture
    ) {
        this.sprite.textureOffset = this.currentFrameSet[0];
        // this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(0, 0, 0, 1));
        // this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public static async Create(centerPosition: vec3, facingDirection: vec3): Promise<BiteProjectile> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const biteDamageSound = await SoundEffectPool.GetInstance().GetAudio('audio/bite.wav');
        const texture = await TexturePool.GetInstance().GetTexture('textures/fang.png');

        return new BiteProjectile(centerPosition, facingDirection, shader, bbShader, biteDamageSound, texture);
    }

    public get AlreadyHit(): boolean {
        return this.alreadyHit;
    }

    public OnHit(): void {
        this.biteDamageSound.Play();
        this.alreadyHit = true;
    }

    public get BoundingBox(): BoundingBox {
        const topLeftCorner = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.bbSize[0] / 2, this.bbSize[1] / 2, 0));
        const bbPos = vec3.add(vec3.create(), topLeftCorner, this.bbOffset); // Adjust bb position with the offset
        return new BoundingBox(bbPos, this.bbSize);
    }

    public get PushbackForce(): vec3 {
        const damagePushback = vec3.scale(vec3.create(), this.facingDirection, -0.01);
        damagePushback[1] -= 0.01;
        return damagePushback;
    }

    public Draw(proj: mat4, view: mat4): void {
        if (!this.animationFinished) {
            const topLeftCorner = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.spriteVisualScale[0] / 2, this.spriteVisualScale[1] / 2, 0));
            mat4.translate(this.batch.ModelMatrix, mat4.create(), topLeftCorner);
            mat4.scale(this.batch.ModelMatrix,
                this.batch.ModelMatrix,
                this.spriteVisualScale);
            this.batch.Draw(proj, view);
        }

        // Draw bb
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.BoundingBox.size[0], this.BoundingBox.size[1], 1));
        this.bbBatch.Draw(proj, view);
    }

    public Update(delta: number): void {
        this.Animate(delta);
        if (this.animationFinished) {
            this.OnHitListeners.forEach(x => x(this));
        }
        // TODO: do not damage hero right after animation has started, but wait a little (spawn bb out of bounds, then move it to the correct position)
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public OnHitListeners: ((sender: IProjectile) => void)[] = [];

    public Dispose(): void {
        console.error('Hey, dispose BiteProjectile');
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 64) { // TODO: time spent on frame
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame >= this.currentFrameSet.length) {
                this.animationFinished = true;
            }

            const currentFrame = this.currentFrameSet[this.currentAnimationFrame];
            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
    }

}
