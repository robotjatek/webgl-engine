import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { TexturePool } from '../TexturePool';
import { Texture } from '../Texture';
import { Hero } from '../Hero';
import { IPickup } from './IPickup';
import { SoundEffect } from '../SoundEffect';
import { SoundEffectPool } from '../SoundEffectPool';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SpriteRenderer } from '../SpriteRenderer';
import { Animation } from '../Animation';


export class CoinObject implements IPickup {
    private readonly renderer: SpriteRenderer;
    private readonly sprite: Sprite;
    private animation: Animation;

    private currentFrameSet: vec2[] = [
        vec2.fromValues(0 / 10, 0),
        vec2.fromValues(1 / 10, 0),
        vec2.fromValues(2 / 10, 0),
        vec2.fromValues(3 / 10, 0),
        vec2.fromValues(4 / 10, 0),
        vec2.fromValues(5 / 10, 0),
        vec2.fromValues(6 / 10, 0),
        vec2.fromValues(7 / 10, 0),
        vec2.fromValues(8 / 10, 0),
        vec2.fromValues(9 / 10, 0)
    ];

    private constructor(
        private position: vec3,
        private onPickup: (pickup: IPickup) => void,
        private shader: Shader,
        private pickupSound: SoundEffect,
        private texture: Texture
    ) {

        // this is hardcoded for coin.png
        this.sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.CreateTextureCoordinates(0, 0, 1.0 / 10, 1.0));
        this.renderer = new SpriteRenderer(shader, texture, this.sprite, vec2.fromValues(1, 1));
        this.animation = new Animation(1 / 60 * 1000 * 3, this.renderer, this.currentFrameSet);
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
        await this.pickupSound.Play();
        hero.CollideWithCoin(this);
        this.onPickup(this);
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public async Update(delta: number): Promise<void> {
        this.animation.Animate(delta);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, 0);
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.shader.Delete();
    }
}