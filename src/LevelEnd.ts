import { Sprite } from './Sprite';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { SpriteBatch } from './SpriteBatch';
import { TexturePool } from './TexturePool';
import { Shader } from './Shader';
import { Utils } from './Utils';
import { Hero } from './Hero';
import { SoundEffect } from './SoundEffect';
import { SoundEffectPool } from './SoundEffectPool';

export class LevelEnd implements ICollider {

    private sprite: Sprite;
    private batch: SpriteBatch;
    private enabled: boolean = false;
    private endReachedEffect: SoundEffect = SoundEffectPool.GetInstance().GetAudio('audio/ding.wav', false);
    private shader = new Shader('shaders/VertexShader.vert', 'shaders/Transparent.frag');
    private static readonly transparentValue: number = 0.5;
    private size: vec3 = vec3.fromValues(2, 1, 0)

    public get IsEnabled(): boolean {
        return this.enabled;
    }

    public set IsEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.shader.SetFloatUniform('alpha', enabled ? 1.0 : LevelEnd.transparentValue);
    }

    public constructor(private position: vec3) {
        const texture = TexturePool.GetInstance().GetTexture('exit.png');
        this.sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
        this.batch = new SpriteBatch(this.shader, [this.sprite], texture);
        this.shader.SetFloatUniform('alpha', LevelEnd.transparentValue);
    }

    // TODO: All these drawable objects need a common interface or a base class with all of the drawing/Update functionality
    public Draw(projection: mat4, view: mat4): void {
        this.batch.Draw(projection, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix, this.batch.ModelMatrix, this.size)
    }

    public IsCollidingWidth(boundingBox: BoundingBox): boolean {
        const bb = new BoundingBox(this.position, vec2.fromValues(this.size[0], this.size[1]))
        return boundingBox.IsCollidingWith(bb);
    }

    // TODO: Interface for interactable objects / Component system for interactable objects
    public Interact(hero: Hero, callback: () => void): void {
        if (this.enabled) {
            this.endReachedEffect.Play(1, 1, () => callback());
        }
    }

}