import { IGameobject } from '../IGameobject';
import { BoundingBox } from '../BoundingBox';
import { IProjectile } from '../Projectiles/IProjectile';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { Hero } from '../Hero/Hero';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { ICollider } from '../ICollider';
import { SpriteRenderer } from '../SpriteRenderer';
import { Animation } from '../Components/Animation';
import { PhysicsComponent } from '../Components/PhysicsComponent';

enum AnimationStates {
    IDLE,
    WALKING
}

export class OldMan implements IGameobject {

    private animationState: AnimationStates = AnimationStates.IDLE;
    private sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(0.0, 0.0, 1.0 / 12.0, 1.0 / 8.0));

    private readonly renderer: SpriteRenderer;

    private visualScale: vec2 = vec2.fromValues(3, 3);
    private bbOffset = vec3.fromValues(1.2, 1.1, 0);
    private bbSize = vec2.fromValues(0.8, 1.8);

    // Last position is used in collision logic, and determining the facing direction when animating
    private lastPosition: vec3 = vec3.fromValues(0, 0, 0);
    private physicsComponent: PhysicsComponent;

    private animation: Animation;
    private leftFacingAnimationFrames = [
        vec2.fromValues(6.0 / 12.0, 7.0 / 8.0),
        vec2.fromValues(7.0 / 12.0, 7.0 / 8.0),
        vec2.fromValues(8.0 / 12.0, 7.0 / 8.0)
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(6.0 / 12.0, 5.0 / 8.0),
        vec2.fromValues(7.0 / 12.0, 5.0 / 8.0),
        vec2.fromValues(8.0 / 12.0, 5.0 / 8.0)
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;

    private constructor(private position: vec3,
                        private shader: Shader,
                        private texture: Texture,
                        private collider: ICollider) {
        vec3.copy(this.lastPosition, this.position);

        this.renderer = new SpriteRenderer(shader, texture, this.sprite, this.visualScale);
        this.renderer.TextureOffset = this.currentFrameSet[0];

        this.animation = new Animation(1 / 60 * 1000 * 15, this.renderer);
        this.physicsComponent = new PhysicsComponent(this.position,
            this.lastPosition,
            () => this.BoundingBox,
            this.bbOffset,
            this.collider,
            false);
    }

    public static async Create(position: vec3, collider: ICollider): Promise<OldMan> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const texture = await TexturePool.GetInstance().GetTexture('textures/People1.png');
        return new OldMan(position, shader, texture, collider);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, 0);
    }

    public Move(direction: vec3): void {
        this.physicsComponent.AddToExternalForce(direction);
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get CenterPosition(): vec3 {
        return vec3.fromValues(this.position[0] + this.visualScale[0] / 2, this.position[1] + this.visualScale[1] / 2, 0);
    }

    public async Update(delta: number): Promise<void> {
        this.Animate(delta);
        this.SetWalkingState();
        this.SetAnimationByFacingDirection();

        this.physicsComponent.Update(delta);
    }

    // TODO: somehow make this part of the animation system
    private SetWalkingState(): void {
        const distanceFromLastPosition = vec3.distance(this.lastPosition, this.position);
        if (distanceFromLastPosition > 0.001) {
            this.animationState = AnimationStates.WALKING;
        } else {
            this.animationState = AnimationStates.IDLE;
        }
    }

    private SetAnimationByFacingDirection(): void {
        const direction = vec3.sub(vec3.create(), this.position, this.lastPosition);
        if (direction[0] < 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
        } else if (direction[0] > 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
        }
    }

    private Animate(delta: number): void {
        if (this.animationState !== AnimationStates.IDLE) {
            this.animation.Animate(delta, this.currentFrameSet);
        }
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
    }

    public get EndCondition(): boolean {
        return false;
    }

    public IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public async Visit(hero: Hero): Promise<void> {
    }

    public get BoundingBox(): BoundingBox {
        const bbPosition = vec3.add(vec3.create(), this.position, this.bbOffset);
        return new BoundingBox(bbPosition, this.bbSize);
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.shader.Delete();
    }

}
