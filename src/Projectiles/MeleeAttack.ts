import { vec2, vec3 } from 'gl-matrix';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Utils } from '../Utils';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from './IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { Hero } from 'src/Hero';
import { ProjectileBase } from './ProjectileBase';

// MeleeAttack is considered as a stationary projectile
export class MeleeAttack extends ProjectileBase {
    private attackSoundPlayed: boolean = false;

    // TODO: animation also could be a component
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;

    private animationFinished = false;

    private constructor(centerPosition: vec3, private facingDirection: vec3,
                        shader: Shader, bbShader: Shader, private attackSound: SoundEffect, texture: Texture) {
        const spriteVisualScale: vec2 = vec2.fromValues(4, 3);
        const bbSize = vec2.fromValues(1.25, 2);
        const bbOffset = vec3.fromValues(0, 0, 0);
        const sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(
                1.0 / 5.0,
                1.0 / 2.0,
                1 / 5.0,
                1 / 2.0));


        super(shader, texture, sprite, centerPosition, spriteVisualScale, bbOffset, bbSize, null, null, bbShader)
        this.animationMustComplete = true;
        //  this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(0, 0, 1, 0.5));
        //bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.5));
    }

    public CollideWithAttack(attack: IProjectile): void {
        // No-op as hero attacks shouldn't interact with each other
    }

    public static async Create(centerPosition: vec3, facingDirection: vec3): Promise<MeleeAttack> {
        // TODO: i really should rename the fragment shader from Hero.frag as everything seems to use it...
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const attackSound = await SoundEffectPool.GetInstance().GetAudio('audio/sword.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/Sword1.png');

        return new MeleeAttack(centerPosition, facingDirection, shader, bbShader, attackSound, texture);
    }

    public get PushbackForce(): vec3 {
        return vec3.fromValues(this.facingDirection[0] / 10, -0.005, 0);
    }

    public OnHit(): void {
        this.alreadyHit = true;
        // no hit sound here for the moment as it can differ on every enemy type
    }

    public Visit(hero: Hero): void {
        // this shouldn't happen as melee attack is an attack by the hero. In the future enemies could use it too...
        throw new Error('Method not implemented.');
    }

    public async Update(delta: number): Promise<void> {
        if (!this.attackSoundPlayed) {
            this.attackSound.Play();
            this.attackSoundPlayed = true;
        }
        this.Animate(delta);

        if (this.animationFinished) {
            super.alreadyHit = true;
            this.OnHitListeners.forEach(l => l.DespawnAttack(this));
        }
    }

    // TODO: animation feels like an ECS too
    // TODO: animation like in DragonEnemy
    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 30) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 4) {
                this.animationFinished = true;
                this.currentAnimationFrame = 1;
            }

            // TODO: hardcoded for sword.png. Make animation parametrizable
            this.batch.TextureOffset = vec2.fromValues(this.currentAnimationFrame / 5.0, 0 / 2.0);
            this.currentFrameTime = 0;
        }
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.shader.Delete();
    }

}