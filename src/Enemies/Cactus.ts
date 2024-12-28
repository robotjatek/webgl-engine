import { vec2, vec3, vec4 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { EnemyBase } from './IEnemy';
import { Texture } from 'src/Texture';
import { TexturePool } from 'src/TexturePool';
import { Shader } from 'src/Shader';
import { Sprite } from 'src/Sprite';
import { Utils } from 'src/Utils';
import { SoundEffectPool } from 'src/SoundEffectPool';
import { SoundEffect } from 'src/SoundEffect';

/**
 * Stationary enemy that cannot be stomped on (like spikes), but it can be damaged with a sword attack
 */
export class Cactus extends EnemyBase {
    private damagedTime = 0;
    private damaged = false;

    private currentFrameTime = 0;
    private currentAnimationFrame = 0;
    private currentFrameSet: vec2[] = [
        vec2.fromValues(0 / 6, 0 / 8),
        vec2.fromValues(1 / 6, 0 / 8),
        vec2.fromValues(2 / 6, 0 / 8),
        vec2.fromValues(3 / 6, 0 / 8),
        vec2.fromValues(4 / 6, 0 / 8),
        vec2.fromValues(5 / 6, 0 / 8),

        vec2.fromValues(0 / 6, 1 / 8),
        vec2.fromValues(1 / 6, 1 / 8),
        vec2.fromValues(2 / 6, 1 / 8),
        vec2.fromValues(3 / 6, 1 / 8),
        vec2.fromValues(4 / 6, 1 / 8),
        vec2.fromValues(5 / 6, 1 / 8),

        vec2.fromValues(0 / 6, 2 / 8),
        vec2.fromValues(1 / 6, 2 / 8),
        vec2.fromValues(2 / 6, 2 / 8),
        vec2.fromValues(3 / 6, 2 / 8),
        vec2.fromValues(4 / 6, 2 / 8),
        vec2.fromValues(5 / 6, 2 / 8),

        vec2.fromValues(0 / 6, 3 / 8),
        vec2.fromValues(1 / 6, 3 / 8),
        vec2.fromValues(2 / 6, 3 / 8),
        vec2.fromValues(3 / 6, 3 / 8),
        vec2.fromValues(4 / 6, 3 / 8),
        vec2.fromValues(5 / 6, 3 / 8),

        vec2.fromValues(0 / 6, 4 / 8),
        vec2.fromValues(1 / 6, 4 / 8),
        vec2.fromValues(2 / 6, 4 / 8),
        vec2.fromValues(3 / 6, 4 / 8),
        vec2.fromValues(4 / 6, 4 / 8),
        vec2.fromValues(5 / 6, 4 / 8),

        vec2.fromValues(0 / 6, 5 / 8),
        vec2.fromValues(1 / 6, 5 / 8),
        vec2.fromValues(2 / 6, 5 / 8),
        vec2.fromValues(3 / 6, 5 / 8),
        vec2.fromValues(4 / 6, 5 / 8),
        vec2.fromValues(5 / 6, 5 / 8),

        vec2.fromValues(0 / 6, 6 / 8),
        vec2.fromValues(1 / 6, 6 / 8),
        vec2.fromValues(2 / 6, 6 / 8),
        vec2.fromValues(3 / 6, 6 / 8),
        vec2.fromValues(4 / 6, 6 / 8),
        vec2.fromValues(5 / 6, 6 / 8),

        vec2.fromValues(0 / 6, 7 / 8),
        vec2.fromValues(1 / 6, 7 / 8),
    ]

    private constructor(
        position: vec3,
        private onDeath: (sender: Cactus) => void,
        shader: Shader,
        bbShader: Shader,
        texture: Texture,
        private enemyDamageSound: SoundEffect,
        private enemyDeathSound: SoundEffect
    ) {
        const sprite: Sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(
                0 / 6,
                0 / 8,
                1 / 6,
                1 / 8
            ));
        const bbSize: vec2 = vec2.fromValues(2.3, 2.5);
        const bbOffset: vec3 = vec3.fromValues(0.35, 0.5, 0);
        const visualScale: vec2 = vec2.fromValues(3, 3);
        const health = 3;

        super(shader, sprite, texture, bbShader, bbSize, bbOffset, position, visualScale, health);
    }

    public static async Create(position: vec3, onDeath: (sender: Cactus) => void): Promise<Cactus> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const damageSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const deathSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
        const texture = await TexturePool.GetInstance().GetTexture('textures/cactus1.png');

        return new Cactus(position, onDeath, shader, bbShader, texture, damageSound, deathSound);
    }

    public async Update(delta: number): Promise<void> {
        this.Animate(delta);

        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 64) { // ~15 fps
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame >= this.currentFrameSet.length) {
                this.currentAnimationFrame = 0;
            }

            this.batch.TextureOffset = this.currentFrameSet[this.currentAnimationFrame];
            this.currentFrameTime = 0;
        }
    }

    public override Damage(pushbackForce: vec3) {
        this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        // Cacti cannot move
        // vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);

        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public get EndCondition(): boolean {
        return false;
    }

    public Visit(hero: Hero): void {
        hero.CollideWithCactus(this);
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

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

}