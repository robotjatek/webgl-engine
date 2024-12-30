import { vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { TexturePool } from '../TexturePool';
import { Utils } from '../Utils';
import { SoundEffectPool } from '../SoundEffectPool';
import { SoundEffect } from 'src/SoundEffect';
import { Texture } from 'src/Texture';
import { ProjectileBase } from './ProjectileBase';

/**
 * A stationary projectile that attacks the player
 */
export class BiteProjectile extends ProjectileBase {
    private animationFinished = false;
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    
    // TODO: flip texture, to achieve left and right facing bite attack
    private currentFrameSet: vec2[] = [
        vec2.fromValues(0 / 5, 0 / 2),
        vec2.fromValues(1 / 5, 0 / 2),
        vec2.fromValues(0 / 5, 1 / 2),
        vec2.fromValues(1 / 5, 1 / 2),
    ];

    private constructor(
        centerPosition: vec3,
        private facingDirection: vec3,
        shader: Shader,
        bbShader: Shader,
        private biteDamageSound: SoundEffect,
        texture: Texture
    ) {
        const bbOffset = vec3.fromValues(0, 0, 0);
        const bbSize = vec2.fromValues(1.6, 1.6);
        const spriteVisualScale = vec2.fromValues(5, 5);
        const sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
                Utils.CreateTextureCoordinates(
                    0 / 5,
                    0 / 2,
                    1 / 5,
                    1 / 2));
        super(shader, texture, sprite, centerPosition, spriteVisualScale, bbOffset, bbSize, null, null, bbShader)
        this.batch.TextureOffset = this.currentFrameSet[0];
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

    public async OnHit(): Promise<void> {
        await this.biteDamageSound.Play();
        this.alreadyHit = true;
    }

    public get PushbackForce(): vec3 {
        const damagePushback = vec3.scale(vec3.create(), this.facingDirection, -0.01);
        damagePushback[1] -= 0.01;
        return damagePushback;
    }

    public async Update(delta: number): Promise<void> {
        this.Animate(delta);
        if (this.animationFinished) {
            this.OnHitListeners.forEach(l => l.RemoveGameObject(this));
        }
        // TODO: do not damage hero right after animation has started, but wait a little (spawn bb out of bounds, then move it to the correct position)
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 64) { // TODO: time spent on frame
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame >= this.currentFrameSet.length) {
                this.animationFinished = true;
            }

            this.batch.TextureOffset = this.currentFrameSet[this.currentAnimationFrame];
            this.currentFrameTime = 0;
        }
    }

}
