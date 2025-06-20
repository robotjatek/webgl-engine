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
import { Animation } from '../Components/Animation';
import { NullCollider } from '../ICollider';

/**
 * A stationary projectile that attacks the player
 */
export class BiteProjectile extends ProjectileBase {
    private animation: Animation;
    
    // TODO: flip texture, to achieve left and right facing bite attack
    private currentFrameSet: vec2[] = [
        vec2.fromValues(0 / 5, 0 / 2),
        vec2.fromValues(1 / 5, 0 / 2),
        vec2.fromValues(0 / 5, 1 / 2),
        vec2.fromValues(1 / 5, 1 / 2),
    ];

    private constructor(
        position: vec3,
        private facingDirection: vec3,
        shader: Shader,
        bbShader: Shader,
        private biteDamageSound: SoundEffect,
        texture: Texture
    ) {
        const sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(
                0 / 5,
                0 / 2,
                1 / 5,
                1 / 2));

        const bbSize = vec2.fromValues(2.0, 2.0);
        const spriteVisualScale = vec2.fromValues(5, 5);
        const bbOffset = facingDirection[0] > 0 ?
            vec3.fromValues(spriteVisualScale[0] - bbSize[0] - 1.25, 1.25, 0) : // left box
            vec3.fromValues(1.25, 1.25, 0); // right box

        const animationMustComplete = true;
        super(shader, texture, sprite, position, spriteVisualScale, bbOffset, bbSize, null, animationMustComplete,
            new NullCollider(), bbShader);

        this.animation = new Animation(64, this.renderer);
    }

    public static async Create(position: vec3, facingDirection: vec3): Promise<BiteProjectile> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const biteDamageSound = await SoundEffectPool.GetInstance().GetAudio('audio/bite.wav');
        const texture = await TexturePool.GetInstance().GetTexture('textures/fang.png');

        return new BiteProjectile(position, facingDirection, shader, bbShader, biteDamageSound, texture);
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
        const animationFinished = this.animation.Animate(delta, this.currentFrameSet);
        if (animationFinished) {
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

}
