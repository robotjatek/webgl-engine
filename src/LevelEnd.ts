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
import { Texture } from './Texture';
import { IDisposable } from './IDisposable';

// TODO: levelend is kind-of a "IPickup" itself
// TODO: Make levelend an IGameObject
export class LevelEnd implements ICollider, IDisposable {

    private sprite: Sprite;
    private batch: SpriteBatch;
    private enabled: boolean = false;
    private static readonly transparentValue: number = 0.5;
    private size: vec3 = vec3.fromValues(2, 1, 0);
    private interacted: boolean = false;

    public get IsEnabled(): boolean {
        return this.enabled;
    }

    public set IsEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.shader.SetFloatUniform('alpha', enabled ? 1.0 : LevelEnd.transparentValue);
    }

    private constructor(private position: vec3, private shader: Shader, private endReachedEffect: SoundEffect, texture: Texture,
        private interactCallback: () => void
    ) {

        this.sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
        this.batch = new SpriteBatch(this.shader, [this.sprite], texture);
        this.shader.SetFloatUniform('alpha', LevelEnd.transparentValue);
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(this.position, vec2.fromValues(this.size[0], this.size[1]));
    }

    public static async Create(position: vec3, interactCallback: () => void): Promise<LevelEnd> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Transparent.frag');
        const endReachedEffect = await SoundEffectPool.GetInstance().GetAudio('audio/ding.wav', false);
        const texture = await TexturePool.GetInstance().GetTexture('textures/exit.png');

        return new LevelEnd(position, shader, endReachedEffect, texture, interactCallback);
    }

    // TODO: All these drawable objects need a common interface or a base class with all of the drawing/Update functionality
    public Draw(projection: mat4, view: mat4): void {
        this.batch.Draw(projection, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix, this.batch.ModelMatrix, this.size)
    }

    public Update(delta: number): void {
        if (this.interacted) {
            this.interactCallback();
        }
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    // TODO: Interface for interactable objects / Component system for interactable objects
    public Interact(hero: Hero): void {
        if (this.enabled) {
            this.endReachedEffect.Play(1, 1, () => this.interacted = true);
        }
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.shader.Delete();
    }

}