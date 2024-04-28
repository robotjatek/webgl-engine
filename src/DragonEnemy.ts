import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { Hero } from './Hero';

export class DragonEnemy implements ICollider {
    // Animation related
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private leftFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 3 / 8),
        vec2.fromValues(4 / 12, 3 / 8),
        vec2.fromValues(5 / 12, 3 / 8),
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 1 / 8),
        vec2.fromValues(4 / 12, 1 / 8),
        vec2.fromValues(5 / 12, 1 / 8),
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;

    // Rendering related
    private texture: Texture = TexturePool.GetInstance().GetTexture('monster2.png');
    private shader: Shader = new Shader('shaders/VertexShader.vert', 'shaders/Hero.frag');
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(0.0 / 12.0, 0.0 / 8.0,
            1.0 / 12.0, 1.0 / 8.0)
    );
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    // Behaviour related
    private timeSinceLastAttack = 0;
    private lastFacingDirection = vec3.fromValues(-1, 0, 0); // Facing right by default

    private bbSize = vec2.fromValues(5, 5);
    private bbOffset = vec3.fromValues(0, 0, 0);

    constructor(
        private position: vec3,
        private visualScale: vec2, // TODO: this should not be a parameter but hardcoded
        private collider: ICollider,
        private hero: Hero,
        private onDeath: (sender: DragonEnemy) => void,
        private spawnProjectiles: (sender: DragonEnemy) => void
    ) {
        this.sprite.textureOffset = this.leftFacingAnimationFrames[0];
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get CenterPosition(): vec3 {
        return vec3.fromValues(
            this.position[0] + this.visualScale[0] / 2,
            this.position[1] + this.visualScale[1] / 2,
            0);
    }

    public get FacingDirection(): vec3 {
        return this.lastFacingDirection;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public IsCollidingWidth(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        // TODO: bounding box drawing
    }

    public Update(delta: number): void {
        this.timeSinceLastAttack += delta;

        // Face in the direction of the hero
        const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
        if (dir[0] < 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, -1, 0, 0);
        } else if (dir[0] > 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, 1, 0, 0);
        }
        this.Animate(delta);

        // TODO: remove damage overlay

        // Attack when hero is near
        if (vec3.distance(this.CenterPosition, this.hero.CenterPosition) < 30
            && this.timeSinceLastAttack > 3000) {
            this.timeSinceLastAttack = 0;
            this.spawnProjectiles(this);
        }

        // Follow hero on the Y axis with a little delay.
        // "Delay" is achieved by moving the dragon slower than the hero movement speed.
        this.MatchHeroHeight(delta);

        // TODO: gravity to velocity -- flying enemy maybe does not need gravity?
        // TODO: velocity to position
    }

    private MatchHeroHeight(delta: number): void {
        // Reduce shaking by only moving when the distance is larger than a limit
        const distance = Math.abs(this.hero.CenterPosition[1] - this.CenterPosition[1]);
        if (distance > 0.2) {
            const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
            if (dir[1] > 0) {
                this.MoveOnY(-0.0025, delta);
            } else if (dir[1] < 0) {
                this.MoveOnY(0.0025, delta);
            }
        }
    }

    private MoveOnY(amount: number, delta: number): void {
        const nextPosition = vec3.fromValues(this.position[0], this.position[1] + amount * delta, 0);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.position = nextPosition;
        }
    }

    private CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const nextBoundingBox = new BoundingBox(vec3.add(vec3.create(), nextPosition, this.bbOffset), this.bbSize);
        return this.collider.IsCollidingWidth(nextBoundingBox, false);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 264) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 2) {
                this.currentAnimationFrame = 0;
            }

            const currentFrame = this.currentFrameSet[this.currentAnimationFrame];
            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
    }

}