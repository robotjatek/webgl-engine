import { mat4, vec3 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { Utils } from './Utils';
import { TexturePool } from './TexturePool';
import { AnimatedSprite } from './AnimatedSprite';
import { Texture } from './Texture';
import { Hero } from './Hero';
import { SoundEffect } from './SoundEffect';
import { SoundEffectPool } from './SoundEffectPool';

// TODO: make this a more generic Interactable object or create a more generic object and use it here wrapped or extended
export class CoinObject implements ICollider {
    private batch: SpriteBatch;
    private sprite: Sprite;
    private texture: Texture;
    private pickupSound: SoundEffect;

    public constructor(
        private position: vec3
    ) {
        this.sprite = new AnimatedSprite(
            Utils.DefaultSpriteVertices, // Im translating to the position on draw, this way a position can be dynamic
            Utils.CreateTextureCoordinates(0, 0, 1.0 / 10, 1.0)); // TODO: this is hardcoded for coin.png

        this.texture = TexturePool.GetInstance().GetTexture('coin.png');
        this.batch = new SpriteBatch(
            new Shader('shaders/VertexShader.vert', 'shaders/FragmentShader.frag'),
            [this.sprite],
            this.texture);

        this.pickupSound = SoundEffectPool.GetInstance().GetAudio('audio/collect.mp3');
    }

    IsCollidingWidth(boundingBox: BoundingBox): boolean {
        // TODO: make a collision helper class
        const minX = this.position[0];
        const maxX = this.position[0] + 1;
        const minY = this.position[1];
        const maxY = this.position[1] + 1;

        const bbMinX = boundingBox.position[0];
        const bbMaxX = boundingBox.position[0] + boundingBox.size[0];
        const bbMinY = boundingBox.position[1];
        const bbMaxY = boundingBox.position[1] + boundingBox.size[1];

        return bbMinX < maxX && bbMaxX > minX &&
            bbMinY < maxY && bbMaxY > minY;
    }

    public Update(elapsedTime: number): void {
        this.sprite.Update(elapsedTime);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
    }

    // TODO: Put Hero behind an interface
    public Interact(hero: Hero) {
        // Interaction with hero now only means pick up
        this.pickupSound.Play();
    }
}