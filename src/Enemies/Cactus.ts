import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from 'src/BoundingBox';
import { Hero } from 'src/Hero';
import { IEnemy } from './IEnemy';
import { Texture } from 'src/Texture';
import { TexturePool } from 'src/TexturePool';
import { Shader } from 'src/Shader';
import { Sprite } from 'src/Sprite';
import { Utils } from 'src/Utils';
import { SpriteBatch } from 'src/SpriteBatch';
import { SoundEffectPool } from 'src/SoundEffectPool';

/**
 * Stationary enemy that cannot be stomped on (like spikes), but it can be damaged with a sword attack
 */
export class Cactus implements IEnemy {

    private health = 3;
    private enemyDamageSound = SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
    private enemyDeathSound = SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
    private damagedTime = 0;
    private damaged = false;

    private texture: Texture = TexturePool.GetInstance().GetTexture('cactus1.png');
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            0 / 6,
            0 / 8,
            1 / 6,
            1 / 8
        ));

    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);
    private visualScale: vec2 = vec2.fromValues(3, 3);

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

    private bbOffset: vec3 = vec3.fromValues(0.35, 0.5, 0);
    private bbSize: vec2 = vec2.fromValues(2.3, 2.5);

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], this.texture);

    private constructor(
        private position: vec3,
        private onDeath: (sender: IEnemy) => void,
        private shader: Shader,
        private bbShader: Shader
    ) {
       // this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public static async Create(position: vec3, onDeath: (sender: IEnemy) => void): Promise<Cactus> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');

        return new Cactus(position, onDeath, shader, bbShader);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        this.batch.ModelMatrix = mat4.create();

        mat4.translate(this.batch.ModelMatrix, this.batch.ModelMatrix, this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.bbSize[0], this.bbSize[1], 1));
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

            const currentFrame = this.currentFrameSet[this.currentAnimationFrame];
            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
    }

    public Damage(pushbackForce: vec3) {
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

    public get Position(): vec3 {
        return this.position;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public Visit(hero: Hero): void {
        hero.CollideWithCactus(this);
    }

    public IsCollidingWidth(boundingBox: BoundingBox, _: boolean): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
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

}