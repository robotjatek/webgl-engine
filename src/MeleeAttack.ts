import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';

export interface IProjectile {
    get AlreadyHit(): boolean;
    set AlreadyHit(value: boolean);
    get BoundingBox(): BoundingBox;
    Draw(proj: mat4, view: mat4): void;
    Update(delta: number): void;
}

// MeleeAttack is considered as a stationary projectile
export class MeleeAttack implements IProjectile {
    // TODO: animation also could be a component
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private texture: Texture = TexturePool.GetInstance().GetTexture('Sword1.png');
    // TODO: i really should rename the fragment shader
    private shader: Shader = new Shader('shaders/VertexShader.vert', 'shaders/Hero.frag');
    private sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            1.0 / 5.0,
            1.0 / 2.0,
            1 / 5.0,
            1 / 2.0));
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    private bbOffset = vec3.fromValues(1, 0.75, 0);
    private bbSize = vec2.fromValues(1.5, 1.5);
    private bbShader = new Shader('shaders/VertexShader.vert', 'shaders/Colored.frag');
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], this.texture);
    private alreadyHit = false;
    private animationFinished = false;

    constructor(private position: vec3) {
        //   this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(0, 0, 1, 0.5));
        //   this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.5));
    }

    // TODO: sphere instead of a box?
    // TODO: adjust bb size and position later
    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public get AlreadyHit(): boolean {
        return this.alreadyHit;
    }

    public set AlreadyHit(hit: boolean) {
        this.alreadyHit = hit;
    }

    // TODO: drawing logic for entities should be an ECS
    public Draw(proj: mat4, view: mat4): void {
        // TODO: draw an animation resembling a sword cut
        if (!this.animationFinished) {
            this.batch.Draw(proj, view);
            mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
            mat4.scale(this.batch.ModelMatrix,
                this.batch.ModelMatrix,
                vec3.fromValues(4, 3, 1)); // visual scale
        }
        // Draw bb
        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.BoundingBox.size[0], this.BoundingBox.size[1], 1));
    }

    public Update(delta: number): void {
        this.Animate(delta);
    }

    // TODO: animation feels like an ECS too
    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 30) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 4) {
                this.animationFinished = true;
                this.currentAnimationFrame = 1;
            }

            // TODO: hardcoded for sword.png. Make animation parametrizable
            this.sprite.textureOffset = vec2.fromValues(this.currentAnimationFrame / 5.0, 0 / 2.0);
            this.currentFrameTime = 0;
        }
    }

}