import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { ICollider } from '../ICollider';
import { IDisposable } from 'src/IDisposable';
import { IGameobject } from 'src/IGameobject';
import { BoundingBox } from '../BoundingBox';
import { IProjectile } from '../Projectiles/IProjectile';
import { Hero } from '../Hero/Hero';
import { Shader } from '../Shader';
import { Sprite } from '../Sprite';
import { Texture } from '../Texture';
import { Utils } from '../Utils';
import { Environment } from '../Environment';
import { SpriteRenderer } from '../SpriteRenderer';
import { IDamageable } from '../Components/DamageComponent';

export interface IEnemy extends ICollider, IDisposable, IGameobject, IDamageable {
    get Position(): vec3;
}

export abstract class EnemyBase implements IEnemy {
    protected renderer: SpriteRenderer;
    protected bbRenderer: SpriteRenderer;
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);

    protected constructor(protected shader: Shader,
                          protected sprite: Sprite,
                          protected texture: Texture,
                          protected bbShader: Shader,
                          protected bbSize: vec2,
                          protected bbOffset: vec3,
                          protected position: vec3,
                          protected visualScale: vec2,
                          protected health: number) {
        this.renderer = new SpriteRenderer(shader, texture, sprite, visualScale);
        this.bbRenderer = new SpriteRenderer(bbShader, null, this.bbSprite, bbSize);
        bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, 0);

        // Bounding box drawing
        if (Environment.RenderBoundingBoxes) {
            this.bbRenderer.Draw(proj, view, this.BoundingBox.position, 0);
        }
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize)
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
        await this.Damage(attack.PushbackForce, 1);
    }

    public abstract Damage(pushbackForce: vec3, damage: number): Promise<void>;
    public abstract DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void>;

    public Dispose(): void {
        this.renderer.Dispose();
        this.bbRenderer.Dispose();
    };

    public abstract get EndCondition(): boolean;

    public abstract Visit(hero: Hero): Promise<void>;

    public get Health(): number {
        return this.health;
    }

    public set Health(health: number) {
        this.health = health;
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public abstract Update(delta: number): Promise<void>;

    public get Position(): vec3 {
        return this.position;
    }
}
