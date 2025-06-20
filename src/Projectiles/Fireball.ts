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
import { Animation } from '../Components/Animation';

export class Fireball extends ProjectileBase {
    private spawnSoundPlayed = false;

    // Animation related
    private animation: Animation;
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
        position: vec3,
        facingDirection: vec3,
        private moveSpeed: vec3,
        collider: ICollider,
        shader: Shader,
        bbShader: Shader,
        hitSound: SoundEffect,
        private spawnSound: SoundEffect,
        private despawnSound: SoundEffect,
        texture: Texture
    ) {
        const bbSize = vec2.fromValues(2.0, 1.0);
        const visualScale = vec2.fromValues(3, 3);
        const bbOffset = facingDirection[0] > 0 ?
            vec3.fromValues(0, 1, 0) :
            vec3.fromValues(1, 1, 0);

        const sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(0, 0, 1 / 8, 1 / 8));

        super(shader, texture, sprite, position, visualScale, bbOffset, bbSize, hitSound,
            false, collider, bbShader);
        this.animation = new Animation(1 / 30 * 1000, this.renderer);

        shader.SetVec4Uniform('clr', vec4.fromValues(0, 1, 0, 0.4));
    }

    public static async Create(position: vec3, facingDir: vec3, moveSpeed: vec3, collider: ICollider): Promise<Fireball> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const hitSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_stomp.wav');
        const despawnSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const spawnSound = await SoundEffectPool.GetInstance().GetAudio('audio/fireball_spawn.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/fireball.png');

        return new Fireball(position, facingDir, moveSpeed, collider, shader, bbShader, hitSound, spawnSound, despawnSound, texture);
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
        await super.Update(delta);
        this.currentFrameSet = this.moveSpeed[0] > 0 ?
            this.rightFacingAnimationFrames :
            this.leftFacingAnimationFrames;
        this.animation.Animate(delta, this.currentFrameSet);

        if (!this.spawnSoundPlayed) {
            await this.spawnSound.Play(1, 0.5);
            this.spawnSoundPlayed = true;
        }

        await this.Move(this.moveSpeed, delta);
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

}
