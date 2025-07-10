import { vec2, vec3, vec4 } from 'gl-matrix';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Utils } from '../Utils';
import { ICollider } from '../ICollider';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from './IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { ProjectileBase } from './ProjectileBase';

export class Fireball extends ProjectileBase{
    private spawnSoundPlayed = false;

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

    private constructor(
        centerPosition: vec3,
        private moveDirection: vec3,
        collider: ICollider,
        shader: Shader,
        bbShader: Shader,
        hitSound: SoundEffect,
        private spawnSound: SoundEffect,
        private despawnSound: SoundEffect,
        texture: Texture
    ) {
        // TODO: although i dont use bbOffset here I kept all duplicated code nearly the same, to make refactors easier
        const bbOffset = vec3.fromValues(0, 0, 0);
        const bbSize = vec2.fromValues(2.0, 1.0);
        const visualScale = vec2.fromValues(3, 3);
        const sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(0, 0, 1 / 8, 1 / 8));

        super(shader, texture, sprite, centerPosition, visualScale, bbOffset, bbSize, hitSound,
            false, collider, bbShader);

        shader.SetVec4Uniform('clr', vec4.fromValues(0, 1, 0, 0.4));
        //bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public static async Create(centerPosition: vec3, moveDirection: vec3, collider: ICollider): Promise<Fireball> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const hitSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_stomp.wav');
        const despawnSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const spawnSound = await SoundEffectPool.GetInstance().GetAudio('audio/fireball_spawn.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/fireball.png');

        return new Fireball(centerPosition, moveDirection, collider, shader, bbShader, hitSound, spawnSound, despawnSound, texture);
    }

    public override get PushbackForce(): vec3 {
        // No pushback from a fireball
        return vec3.create();
    }

    public override Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

    public async Update(delta: number): Promise<void> {
        this.currentFrameSet = this.moveDirection[0] > 0 ?
            this.rightFacingAnimationFrames :
            this.leftFacingAnimationFrames;
        this.Animate(delta);

        if (!this.spawnSoundPlayed) {
            await this.spawnSound.Play(1, 0.5);
            this.spawnSoundPlayed = true;
        }

        await this.Move(this.moveDirection, delta);

        if (this.AlreadyHit) {
            this.OnHitListeners.forEach(l => l.RemoveGameObject(this));
        }
    }

    public override async CollideWithAttack(attack: IProjectile): Promise<void> {
        if (!this.AlreadyHit) {
            await this.despawnSound.Play();
            await this.OnHit();
        }
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;

        // This is ~30 fps animation
        if (this.currentFrameTime >= 16 * 2) {
            this.currentAnimationFrameIndex++;
            if (this.currentAnimationFrameIndex >= this.currentFrameSet.length) {
                this.currentAnimationFrameIndex = 0;
            }

            this.batch.TextureOffset = this.currentFrameSet[this.currentAnimationFrameIndex];
            this.currentFrameTime = 0;
        }
    }

}
