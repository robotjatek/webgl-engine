import { IProjectile } from './IProjectile';
import { BoundingBox } from '../BoundingBox';
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Hero } from '../Hero';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { Sprite } from '../Sprite';
import { SoundEffect } from '../SoundEffect';
import { ICollider } from '../ICollider';
import { Utils } from '../Utils';
import { IProjectileHitListener } from '../Level';
import { Environment } from '../Environment';
import { SpriteRenderer } from '../SpriteRenderer';


export abstract class ProjectileBase implements IProjectile {
    protected renderer: SpriteRenderer;
    protected bbRenderer: SpriteRenderer;
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);

    protected alreadyHit = false;
    protected OnHitListeners: IProjectileHitListener[] = [];


    protected constructor(protected shader: Shader,
                          protected texture: Texture,
                          protected sprite: Sprite,
                          protected centerPosition: vec3,
                          protected visualScale: vec2,
                          protected bbOffset: vec3,
                          protected bbSize: vec2,
                          protected hitSound: SoundEffect | null,
                          protected animationMustComplete: boolean,
                          private collider: ICollider | null,
                          protected bbShader: Shader) {
        this.renderer = new SpriteRenderer(shader, texture, sprite, visualScale);
        this.bbRenderer = new SpriteRenderer(bbShader, null, this.bbSprite, bbSize);
        bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public Draw(proj: mat4, view: mat4): void {
        if (!this.AlreadyHit || this.animationMustComplete) {
            const topLeft = vec3.sub(vec3.create(), this.centerPosition, vec3.fromValues(this.visualScale[0] / 2, this.visualScale[1] / 2, 0));
            this.renderer.Draw(proj, view, topLeft);
        }

        if (Environment.RenderBoundingBoxes) {
            this.bbRenderer.Draw(proj, view, this.BoundingBox.position);
        }
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

    public async OnHit(): Promise<void> {
        this.alreadyHit = true;
    }

    public SubscribeToHitEvent(onHitListener: IProjectileHitListener) {
        this.OnHitListeners.push(onHitListener);
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.bbRenderer.Dispose();
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    public abstract get PushbackForce(): vec3;

    public async Visit(hero: Hero): Promise<void> {
        await hero.InteractWithProjectile(this);
    }

    // TODO: generic move function as a component
    protected async Move(direction: vec3, delta: number): Promise<void> {
        const nextPosition = vec3.scaleAndAdd(vec3.create(), this.centerPosition, direction, delta);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.centerPosition = nextPosition;
        } else {
            await this.hitSound?.Play();
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