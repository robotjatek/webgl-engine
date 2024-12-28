import { IProjectile } from './IProjectile';
import { BoundingBox } from '../BoundingBox';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { Hero } from '../Hero';
import { SpriteBatch } from '../SpriteBatch';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { Sprite } from '../Sprite';
import { SoundEffect } from '../SoundEffect';
import { ICollider } from '../ICollider';
import { Utils } from '../Utils';
import { IProjectileHitListener } from '../Level';


export abstract class ProjectileBase implements IProjectile {
    protected alreadyHit = false;
    protected animationMustComplete = false;
    protected batch: SpriteBatch;
    protected OnHitListeners: IProjectileHitListener[] = [];

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    protected bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

    protected constructor(protected shader: Shader,
                          protected texture: Texture,
                          protected sprite: Sprite,
                          protected centerPosition: vec3,
                          protected visualScale: vec2,
                          protected bbOffset: vec3,
                          protected bbSize: vec2,
                          protected hitSound: SoundEffect | null,
                          private collider: ICollider | null,
                          protected bbShader: Shader) {
        this.batch = new SpriteBatch(this.shader, [this.sprite], this.texture);
    }

    public Draw(proj: mat4, view: mat4): void {
        if (!this.AlreadyHit || this.animationMustComplete) {
            const topLeft = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.visualScale[0] / 2, this.visualScale[1] / 2, 0));
            mat4.translate(this.batch.ModelMatrix, mat4.create(), topLeft);
            mat4.scale(this.batch.ModelMatrix,
                this.batch.ModelMatrix,
                vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));
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

    public get AlreadyHit(): boolean {
        return this.alreadyHit;
    }

    public get EndCondition(): boolean {
        return false;
    }

    public get BoundingBox(): BoundingBox {
        const topLeftCorner = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.bbSize[0] / 2, this.bbSize[1] / 2, 0));
        const bbPos = vec3.add(vec3.create(), topLeftCorner, this.bbOffset); // Adjust bb position with the offset
        return new BoundingBox(bbPos, this.bbSize);
    }

    public CollideWithAttack(attack: IProjectile): void {
        // Do nothing
        // NOTE: overriding this could be used to cancel a projectile with an attack
    }

    public OnHit(): void {
        this.alreadyHit = true;
    }

    public SubscribeToHitEvent(onHitListener: IProjectileHitListener) {
        this.OnHitListeners.push(onHitListener);
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.bbBatch.Dispose();
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    public abstract get PushbackForce(): vec3;

    public Visit(hero: Hero): void {
        hero.InteractWithProjectile(this);
    }

    // TODO: generic move function as a component
    protected Move(direction: vec3, delta: number): void {
        const nextPosition = vec3.scaleAndAdd(vec3.create(), this.centerPosition, direction, delta);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.centerPosition = nextPosition;
        } else {
            this.hitSound?.Play();
            this.alreadyHit = true;
        }
    }

    // TODO: yet another duplication
    private CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const topleft = vec3.sub(vec3.create(), nextPosition, vec3.fromValues(this.bbSize[0] / 2, this.bbSize[1] / 2, 0));
        const bbPos = vec3.add(vec3.create(), topleft, this.bbOffset);
        const nextBoundingBox = new BoundingBox(bbPos, this.bbSize);
        return this.collider?.IsCollidingWith(nextBoundingBox, false) ?? false;
    }

    public abstract Update(delta: number): Promise<void>;

}