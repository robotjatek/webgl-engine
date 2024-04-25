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

    constructor(
        private position: vec3,
        private visualScale: vec2,
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

    public IsCollidingWidth(boundingBox: BoundingBox): boolean {
        throw new Error('Method not implemented.');
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

        const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
        if (dir[0] < 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, -1, 0, 0);
        } else if (dir[0] > 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, 1, 0, 0);
        }
        this.Animate(delta, this.currentFrameSet);

        // TODO: remove damage overlay

        if (vec3.distance(this.CenterPosition, this.hero.CenterPosition) < 30
            && this.timeSinceLastAttack > 3000) {
                this.timeSinceLastAttack = 0;
            this.spawnProjectiles(this);
        }

        // TODO: gravity to velocity -- flying enemy maybe does not need gravity?
        // TODO: velocity to position
        // TODO: Handle collision with collider
    }

    private Animate(delta: number, frameset: vec2[]): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 264) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 2) {
                this.currentAnimationFrame = 0;
            }

            const currentFrame = frameset[this.currentAnimationFrame];

            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
    }

}