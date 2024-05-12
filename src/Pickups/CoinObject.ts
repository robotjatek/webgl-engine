import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { SpriteBatch } from '../SpriteBatch';
import { Utils } from '../Utils';
import { TexturePool } from '../TexturePool';
import { AnimatedSprite } from '../AnimatedSprite';
import { Texture } from '../Texture';
import { Hero } from '../Hero';
import { IPickup } from './IPickup';
import { SoundEffect } from '../SoundEffect';
import { SoundEffectPool } from '../SoundEffectPool';

export class CoinObject implements IPickup {
    private batch: SpriteBatch;
    private sprite: Sprite;
    private texture: Texture;

    private constructor(
        private position: vec3,
        private onPickup: (pickup: IPickup) => void,
        shader: Shader,
        private pickupSound: SoundEffect
    ) {
        this.sprite = new AnimatedSprite(
            Utils.DefaultSpriteVertices, // Im translating to the position on draw, this way a position can be dynamic
            Utils.CreateTextureCoordinates(0, 0, 1.0 / 10, 1.0)); // TODO: this is hardcoded for coin.png

        this.texture = TexturePool.GetInstance().GetTexture('coin.png');
        this.batch = new SpriteBatch(
            shader,
            [this.sprite],
            this.texture);
    }

    public static async Create(position: vec3, onPickup: (pickup: IPickup) => void): Promise<CoinObject> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        const pickupSound = await SoundEffectPool.GetInstance().GetAudio('audio/collect.mp3');
        return new CoinObject(position, onPickup, shader, pickupSound);
    }
    
    public get EndCondition(): boolean {
        return true;
    }

    public Visit(hero: Hero): void {
        this.pickupSound.Play();
        hero.CollideWithCoin(this); // TODO: this is now a no-op call
        this.onPickup(this);
    }

    public IsCollidingWidth(boundingBox: BoundingBox): boolean {
        const bb = new BoundingBox(this.position, vec2.fromValues(1, 1));
        return boundingBox.IsCollidingWith(bb);
    }

    public async Update(elapsedTime: number): Promise<void> {
        this.sprite.Update(elapsedTime);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
    }
}