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
import { PhysicsComponent } from '../Components/PhysicsComponent';


export abstract class ProjectileBase implements IProjectile {
    protected renderer: SpriteRenderer;
    protected bbRenderer: SpriteRenderer;
    private physicsComponent: PhysicsComponent;
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);

    protected alreadyHit = false;
    protected OnHitListeners: IProjectileHitListener[] = [];

    protected constructor(protected shader: Shader,
                          protected texture: Texture,
                          protected sprite: Sprite,
                          protected position: vec3,
                          protected visualScale: vec2,
                          protected bbOffset: vec3,
                          protected bbSize: vec2,
                          protected hitSound: SoundEffect | null,
                          protected animationMustComplete: boolean,
                          private collider: ICollider,
                          protected bbShader: Shader) {
        this.renderer = new SpriteRenderer(shader, texture, sprite, visualScale);
        this.bbRenderer = new SpriteRenderer(bbShader, null, this.bbSprite, bbSize);
        this.physicsComponent = new PhysicsComponent(position, vec3.create(), () => this.BoundingBox, bbOffset, collider, true, true);
        bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public Draw(proj: mat4, view: mat4): void {
        if (!this.AlreadyHit || this.animationMustComplete) {
            this.renderer.Draw(proj, view, this.position, 0);
        }

        if (Environment.RenderBoundingBoxes) {
            this.bbRenderer.Draw(proj, view, this.BoundingBox.position, 0);
        }
    }

    public get AlreadyHit(): boolean {
        return this.alreadyHit;
    }

    public get EndCondition(): boolean {
        return false;
    }

    public get BoundingBox(): BoundingBox {
        const bbPos = vec3.add(vec3.create(), this.position, this.bbOffset); // Adjust bb position with the offset
        return new BoundingBox(bbPos, this.bbSize);
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
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

    protected async Move(direction: vec3, delta: number): Promise<void> {
        if (!this.physicsComponent.Colliding) {
            this.physicsComponent.AddToExternalForce(vec3.scale(vec3.create(), direction, delta));
        } else {
            await this.hitSound?.Play();
            this.alreadyHit = true;
        }
    }

    public async Update(delta: number): Promise<void> {
        this.physicsComponent.Update(delta);
    }

}
