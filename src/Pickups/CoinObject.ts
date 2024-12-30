import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { SpriteBatch } from '../SpriteBatch';
import { Utils } from '../Utils';
import { TexturePool } from '../TexturePool';
import { Texture } from '../Texture';
import { Hero } from '../Hero';
import { IPickup } from './IPickup';
import { SoundEffect } from '../SoundEffect';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from 'src/Projectiles/IProjectile';

export class CoinObject implements IPickup {
    private readonly batch: SpriteBatch;
    private readonly sprite: Sprite;
    private frameNumber = 0;
    private currentFrameTime = 0;

    private constructor(
        private position: vec3,
        private onPickup: (pickup: IPickup) => void,
        private shader: Shader,
        private pickupSound: SoundEffect,
        private texture: Texture
    ) {

        // this is hardcoded for coin.png
        this.sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.CreateTextureCoordinates(0, 0, 1.0 / 10, 1.0));
        this.batch = new SpriteBatch(shader, [this.sprite], this.texture);
    }

    public static async Create(position: vec3, onPickup: (pickup: IPickup) => void): Promise<CoinObject> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        const pickupSound = await SoundEffectPool.GetInstance().GetAudio('audio/collect.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/coin.png');
        return new CoinObject(position, onPickup, shader, pickupSound, texture);
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(this.position, vec2.fromValues(1, 1));
    }

    public get EndCondition(): boolean {
        return true;
    }

    public CollideWithAttack(attack: IProjectile): void {
        // No-op
    }

    public async Visit(hero: Hero): Promise<void> {
        this.pickupSound.Play();
        hero.CollideWithCoin(this);
        this.onPickup(this);
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public async Update(elapsedTime: number): Promise<void> {
        this.Animate(elapsedTime);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 64) {
            if (this.frameNumber === 9) {
                this.batch.TextureOffset = vec2.fromValues(0, 0);
                this.frameNumber = 0;
            }
            this.frameNumber++;
            vec2.add(this.batch.TextureOffset, this.batch.TextureOffset, vec2.fromValues(1.0 / 10, 0)); // TODO: this is hardcoded for coin.png
            this.currentFrameTime = 0;
        }
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.shader.Delete();
    }
}