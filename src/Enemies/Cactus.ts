import { vec2, vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { EnemyBase } from './IEnemy';
import { Texture } from 'src/Texture';
import { TexturePool } from 'src/TexturePool';
import { Shader } from 'src/Shader';
import { Sprite } from 'src/Sprite';
import { Utils } from 'src/Utils';
import { SoundEffectPool } from 'src/SoundEffectPool';
import { SoundEffect } from 'src/SoundEffect';
import { Animation } from '../Components/Animation';
import { StompState } from '../Hero/States/DeadState';
import { FlashOverlayComponent } from '../Components/FlashOverlayComponent';

/**
 * Stationary enemy that cannot be stomped on (like spikes), but it can be damaged with a sword attack
 */
export class Cactus extends EnemyBase {
    private damageFlashComponent: FlashOverlayComponent;

    private animation: Animation;
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
        this.animation = new Animation(1 / 15 * 1000, this.renderer); // 15 fps animation
        this.damageFlashComponent = new FlashOverlayComponent(this.shader);
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
        this.animation.Animate(delta, this.currentFrameSet);
        this.damageFlashComponent.Update(delta);
    }

    public override async Damage(pushbackForce: vec3): Promise<void> {
        await this.enemyDamageSound.Play();
        this.health--;
        this.damageFlashComponent.Flash(this.damageFlashComponent.DAMAGE_OVERLAY_COLOR,
            this.damageFlashComponent.DAMAGE_FLASH_DURATION);
        // Cacti cannot move
        // vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);

        if (this.health <= 0) {
            if (this.onDeath) {
                await this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public get EndCondition(): boolean {
        return false;
    }

    public async Visit(hero: Hero): Promise<void> {
        if (hero.StateClass !== StompState.name) {
            await hero.DamageWithInvincibilityConsidered(vec3.fromValues(0, -0.01, 0), 20);
        } else {
            // cactus will hurt the hero when stomping on it
            await hero.Damage(vec3.fromValues(0, -0.008, 0), 20);
            await hero.ChangeState(hero.AFTER_STOMP_STATE());
        }
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

}
