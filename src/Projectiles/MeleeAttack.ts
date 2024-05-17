import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { SpriteBatch } from '../SpriteBatch';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Utils } from '../Utils';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from './IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { Hero } from 'src/Hero';

// MeleeAttack is considered as a stationary projectile
export class MeleeAttack implements IProjectile {
    private attackSoundPlayed: boolean = false;

    // TODO: animation also could be a component
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private spriteVisualScale: vec3 = vec3.fromValues(4, 3, 0);
    private sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            1.0 / 5.0,
            1.0 / 2.0,
            1 / 5.0,
            1 / 2.0));
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    private bbSize = vec2.fromValues(1.25, 2);
    // Center the bb inside the attack sprite based on it's size
    private bbOffset = vec3.fromValues(
        this.spriteVisualScale[0] / 2 - (this.bbSize[0] / 2),
        this.spriteVisualScale[1] / 2 - this.bbSize[1] / 2,
        0);
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);
    private alreadyHit = false;
    private animationFinished = false;

    private constructor(private position: vec3, private facingDirection: vec3,
        private shader: Shader, private bbShader: Shader, private attackSound: SoundEffect, private texture: Texture) {
        //  this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(0, 0, 1, 0.5));
        //  this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.5));
    }

    public static async Create(position: vec3, facingDirection: vec3): Promise<MeleeAttack> {
        // TODO: i really should rename the fragment shader from Hero.frag as everything seems to use it...
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const attackSound = await SoundEffectPool.GetInstance().GetAudio('audio/sword.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/Sword1.png');

        return new MeleeAttack(position, facingDirection, shader, bbShader, attackSound, texture);
    }

    OnHitListeners: ((sender: IProjectile) => void)[] = [];

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox)
    }

    get EndCondition(): boolean {
        return false;
    }

    // TODO: sphere instead of a box?
    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public get PushbackForce(): vec3 {
        const pushbackForce = vec3.fromValues(this.facingDirection[0] / 10, -0.005, 0);
        return pushbackForce;
    }

    public get AlreadyHit(): boolean {
        return this.alreadyHit;
    }

    public OnHit(): void {
        this.alreadyHit = true;
        // no hit sound here for the moment as it can differ on every enemy type
    }

    public Visit(hero: Hero): void {
        // this shouldnt happen as melee attack is an attack by the hero. In the future enemies could use it too...
        throw new Error('Method not implemented.');
    }

    // TODO: drawing logic for entities should be an ECS
    public Draw(proj: mat4, view: mat4): void {
        if (!this.animationFinished) {
            mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
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

    public Dispose(): void {
        // TODO: dispose
        console.error('Dispose melee attack');
    }

    public async Update(delta: number): Promise<void> {
        if (!this.attackSoundPlayed) {
            this.attackSound.Play();
            this.attackSoundPlayed = true;
        }
        this.Animate(delta);
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
            this.sprite.textureOffset = vec2.fromValues(this.currentAnimationFrame / 5.0, 0 / 2.0);
            this.currentFrameTime = 0;
        }
    }

}