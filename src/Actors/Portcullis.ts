import { IGameobject } from '../IGameobject';
import { BoundingBox } from '../BoundingBox';
import { IProjectile } from '../Projectiles/IProjectile';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { SpriteRenderer } from '../SpriteRenderer';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { Hero } from '../Hero/Hero';
import { PhysicsComponent } from '../Components/PhysicsComponent';
import { ICollider, NullCollider } from '../ICollider';

export class Portcullis implements IGameobject {

    private readonly sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private readonly renderer: SpriteRenderer;
    private readonly physicsComponent: PhysicsComponent;

    private constructor(private position: vec3,
                        private shader: Shader,
                        private texture: Texture,
                        private collider: ICollider) {
        this.renderer = new SpriteRenderer(shader, texture, this.sprite, vec2.fromValues(1, 1));
        this.physicsComponent = new PhysicsComponent(this.position, vec3.create(), () => this.BoundingBox, vec3.create(),
            new NullCollider(), true)
    }

    public static async Create(position: vec3, texture: Texture, collider: ICollider): Promise<Portcullis> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        return new Portcullis(position, shader, texture, collider);
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(this.position, vec2.fromValues(1, 1));
    }

    public Move(delta: number, direction: vec3): void {
        this.physicsComponent.AddToExternalForce(direction);
    }

    public ResetVelocity(): void {
        this.physicsComponent.ResetVelocity();
    }

    public get Position(): vec3 {
        return this.position;
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, 0);
    }

    public get EndCondition(): boolean {
        return false;
    }

    public IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        return false;
    }

    public async Update(delta: number): Promise<void> {
        this.physicsComponent.Update(delta);
    }

    public async Visit(hero: Hero): Promise<void> {
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.shader.Delete();
    }

}
