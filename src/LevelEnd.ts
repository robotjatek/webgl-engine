import { Sprite } from './Sprite';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox';
import { SpriteBatch } from './SpriteBatch';
import { TexturePool } from './TexturePool';
import { Shader } from './Shader';
import { Utils } from './Utils';
import { Hero } from './Hero';
import { SoundEffect } from './SoundEffect';
import { SoundEffectPool } from './SoundEffectPool';
import { Texture } from './Texture';
import { IDisposable } from './IDisposable';
import { IGameobject } from './IGameobject';
import { IProjectile } from './Projectiles/IProjectile';
import { Level } from './Level';

export interface IEndConditionsMetEventListener {
    OnEndConditionsMet(): void;
}

export class LevelEnd implements IGameobject, IEndConditionsMetEventListener, IDisposable {

    private sprite: Sprite;
    private batch: SpriteBatch;
    private enabled: boolean = false;
    private static readonly transparentValue: number = 0.5;
    private size: vec3 = vec3.fromValues(2, 1, 0);
    private interacted: boolean = false;

    private constructor(private position: vec3, private shader: Shader, private endReachedEffect: SoundEffect, texture: Texture,
        private interactCallback: () => void, private level: Level
    ) {
        this.sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
        this.batch = new SpriteBatch(this.shader, [this.sprite], texture);
        this.shader.SetFloatUniform('alpha', LevelEnd.transparentValue);
    }

    public OnEndConditionsMet(): void {
        this.enabled = true;
        this.shader.SetFloatUniform('alpha', this.enabled ? 1.0 : LevelEnd.transparentValue);
    }

    public get EndCondition(): boolean {
        return false;
    }

    public CollideWithAttack(attack: IProjectile): void {
        // NO-OP
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(this.position, vec2.fromValues(this.size[0], this.size[1]));
    }

    public static async Create(position: vec3, interactCallback: () => void, level: Level): Promise<LevelEnd> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Transparent.frag');
        const endReachedEffect = await SoundEffectPool.GetInstance().GetAudio('audio/ding.wav', false);
        const texture = await TexturePool.GetInstance().GetTexture('textures/exit.png');

        return new LevelEnd(position, shader, endReachedEffect, texture, interactCallback, level);
    }

    // TODO: All these drawable objects need a common interface or a base class with all of the drawing/Update functionality
    public Draw(projection: mat4, view: mat4): void {
        this.batch.Draw(projection, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix, this.batch.ModelMatrix, this.size)
    }

    public async Update(delta: number): Promise<void> {
        if (this.interacted) {
            this.interactCallback();
        }
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Visit(hero: Hero): void {
        if (this.enabled && !this.interacted) {
            this.level.updateDisabled = true; // pause level updates
            this.endReachedEffect.Play(1, 1, () => {
                /** Wait for the soundeffect to play then restart level update loop.
                * This in turn will result in the calling of the @see Update() method,
                * which will notify the game object that the level change can occur
                */
                this.interacted = true;
                this.level.updateDisabled = false;
            });
        }
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.shader.Delete();
    }

}