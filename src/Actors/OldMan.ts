import { IGameobject } from '../IGameobject';
import { BoundingBox } from '../BoundingBox';
import { IProjectile } from '../Projectiles/IProjectile';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { Hero } from '../Hero';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { SpriteBatch } from '../SpriteBatch';
import { ICollider } from '../ICollider';

enum AnimationStates {
    IDLE,
    WALKING
}

export class OldMan implements IGameobject {

    private animationState: AnimationStates = AnimationStates.IDLE;

    private sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(0.0, 0.0, 1.0 / 12.0, 1.0 / 8.0));

    private batch = new SpriteBatch(this.shader, [this.sprite], this.texture);
    private visualScale: vec2 = vec2.fromValues(3, 3);
    private bbOffset = vec3.fromValues(1.2, 1.1, 0);
    private bbSize = vec2.fromValues(0.8, 1.8);

    private velocity: vec3 = vec3.fromValues(0, 0, 0);
    // Last position is used in collision logic, and determining the facing direction when animating
    private lastPosition: vec3 = vec3.fromValues(0, 0, 0);

    private leftFacingAnimationFrames = [
        vec2.fromValues(6.0 / 12.0, 7.0 / 8.0),
        vec2.fromValues(7.0 / 12.0, 7.0 / 8.0),
        vec2.fromValues(8.0 / 12.0, 7.0 / 8.0),
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(6.0 / 12.0, 5.0 / 8.0),
        vec2.fromValues(7.0 / 12.0, 5.0 / 8.0),
        vec2.fromValues(8.0 / 12.0, 5.0 / 8.0),
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;
    private currentFrameTime = 0;
    private currentFrameIndex = 0;

    private constructor(private position: vec3,
                        private shader: Shader,
                        private texture: Texture,
                        private collider: ICollider) {
        vec3.copy(this.lastPosition, this.position);
        this.batch.TextureOffset = this.currentFrameSet[this.currentFrameIndex];
    }

    public static async Create(position: vec3, collider: ICollider): Promise<OldMan> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const texture = await TexturePool.GetInstance().GetTexture('textures/People1.png');
        return new OldMan(position, shader, texture, collider);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        const modelMat = mat4.create();
        mat4.translate(modelMat, modelMat, this.position);
        mat4.scale(modelMat, modelMat, vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));
        this.batch.ModelMatrix = modelMat;
    }

    public Move(direction: vec3, delta: number): void {
        const nextPosition = vec3.scaleAndAdd(vec3.create(), this.position, direction, delta);
        if (!this.CheckCollision(nextPosition)) {
            this.position = nextPosition;
        }
    }

    private CheckCollision(nextPosition: vec3): boolean {
        const nextBoundingBox = new BoundingBox(vec3.add(vec3.create(), nextPosition, this.bbOffset), this.bbSize);
        return this.collider.IsCollidingWith(nextBoundingBox, true);
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

        vec3.copy(this.lastPosition, this.position);
        this.ApplyGravityToVelocity(delta);
        this.ApplyVelocityToPosition(delta);
    }

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
            this.ChangeFrameSet(this.leftFacingAnimationFrames);
        } else if (direction[0] > 0) {
            this.ChangeFrameSet(this.rightFacingAnimationFrames);
        }
    }

    private Animate(delta: number): void {
        if (this.animationState !== AnimationStates.IDLE) {
            this.currentFrameTime += delta;
            if (this.currentFrameTime > 1 / 60 * 16 * 1000) {
                this.currentFrameIndex++;
                if (this.currentFrameIndex > 2) {
                    this.currentFrameIndex = 0;
                }
                this.batch.TextureOffset = this.currentFrameSet[this.currentFrameIndex];
                this.currentFrameTime = 0;
            }
        }
    }

    private ApplyGravityToVelocity(delta: number): void {
        const gravity = vec3.fromValues(0, 0.00004, 0);
        vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), gravity, delta));
    }

    private ApplyVelocityToPosition(delta: number): void {
        const nextPosition = vec3.scaleAndAdd(vec3.create(), this.position, this.velocity, delta);
        if (this.CheckCollision(nextPosition)) {
            // reset the position to the last non-colliding position
            vec3.copy(this.position, this.lastPosition);
            this.velocity = vec3.create();
            return;
        }
        this.position = nextPosition;
    }

    /**
     * Helper function to make frame changes seamless by immediatelly changing the sprite offset when a frame change happens
     */
    private ChangeFrameSet(frames: vec2[]) {
        this.currentFrameSet = frames;
        this.batch.TextureOffset = this.currentFrameSet[this.currentFrameIndex];
    }

    public CollideWithAttack(attack: IProjectile): void {
    }

    public get EndCondition(): boolean {
        return false;
    }

    public IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Visit(hero: Hero): void {
    }

    public get BoundingBox(): BoundingBox {
        const bbPosition = vec3.add(vec3.create(), this.position, this.bbOffset);
        return new BoundingBox(bbPosition, this.bbSize);
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.shader.Delete();
    }

}