import { mat4, vec2, vec3 } from 'gl-matrix';
import { ICollider } from '../ICollider';
import { IDisposable } from 'src/IDisposable';
import { IGameobject } from 'src/IGameobject';
import { BoundingBox } from '../BoundingBox';
import { IProjectile } from '../Projectiles/IProjectile';
import { Hero } from '../Hero';
import { SpriteBatch } from '../SpriteBatch';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { Texture } from '../Texture';
import { Utils } from '../Utils';

export interface IEnemy extends ICollider, IDisposable, IGameobject {
    Damage(pushbackForce: vec3): Promise<void>;
    get Position(): vec3;
    get Health(): number;
}

export abstract class EnemyBase implements IEnemy {
    protected batch: SpriteBatch;
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    protected bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

    protected constructor(protected shader: Shader,
                          protected sprite: Sprite,
                          protected texture: Texture,
                          protected bbShader: Shader,
                          protected bbSize: vec2,
                          protected bbOffset: vec3,
                          protected position: vec3,
                          protected visualScale: vec2,
                          protected health: number) {
        this.batch = new SpriteBatch(shader, [sprite], texture);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        // Bounding box drawing
        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.bbSize[0], this.bbSize[1], 1));
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize)
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
        await this.Damage(attack.PushbackForce);
    }

    public abstract Damage(pushbackForce: vec3): Promise<void>;

    public Dispose(): void {
        this.batch.Dispose();
        this.bbBatch.Dispose();
    };

    public abstract get EndCondition(): boolean;

    public abstract Visit(hero: Hero): Promise<void>;

    public get Health(): number {
        return this.health;
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public abstract Update(delta: number): Promise<void>;

    public get Position(): vec3 {
        return this.position;
    }
}
