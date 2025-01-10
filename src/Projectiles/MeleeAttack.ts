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
import { Animation } from '../Animation';

// MeleeAttack is considered as a stationary projectile
export class MeleeAttack extends ProjectileBase {
    private attackSoundPlayed: boolean = false;

    private animation: Animation;
    private currentFrameSet: vec2[] = [
        vec2.fromValues(1 / 5.0, 1 / 2.0),
        vec2.fromValues(2 / 5.0, 1 / 2.0),
        vec2.fromValues(3 / 5.0, 1 / 2.0)
    ];

    private constructor(centerPosition: vec3, private facingDirection: vec3,
                        shader: Shader, bbShader: Shader, private attackSound: SoundEffect, texture: Texture) {
        const spriteVisualScale: vec2 = vec2.fromValues(4, 3);
        const bbSize = vec2.fromValues(1.25, 2);
        const bbOffset = vec3.fromValues(0, 0, 0);
        const sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(
                0.0 / 5.0,
                0.0 / 2.0,
                1.0 / 5.0,
                1.0 / 2.0));


        const animationMustComplete = true;
        super(shader, texture, sprite, centerPosition, spriteVisualScale, bbOffset, bbSize, null, animationMustComplete,
            null, bbShader);
        this.animation = new Animation(1 / 30 * 1000, this.renderer, this.currentFrameSet);
        this.renderer.TextureOffset = this.currentFrameSet[0];
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
        return vec3.fromValues(this.facingDirection[0] / 50, -0.005, 0);
    }

    public override async OnHit(): Promise<void> {
        this.alreadyHit = true;
        // no hit sound here for the moment as it can differ on every enemy type
    }

    public async Visit(hero: Hero): Promise<void> {
        // this shouldn't happen as melee attack is an attack by the hero. In the future enemies could use it too...
        throw new Error('Method not implemented.');
    }

    public async Update(delta: number): Promise<void> {
        if (!this.attackSoundPlayed) {
            const pitch = 0.8 + Math.random() * (1.4 - 0.8);
            await this.attackSound.Play(pitch);
            this.attackSoundPlayed = true;
        }

        const animationFinished = this.animation.Animate(delta);
        if (animationFinished) {
            this.alreadyHit = true;
            this.OnHitListeners.forEach(l => l.DespawnAttack(this));
        }
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

}