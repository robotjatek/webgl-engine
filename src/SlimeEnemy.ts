import { ICollider } from './ICollider';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { Sprite } from './Sprite';
import { Utils } from './Utils';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { BoundingBox } from './BoundingBox';

export class SlimeEnemy implements ICollider {
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private shader: Shader = new Shader('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
    private texture: Texture = TexturePool.GetInstance().GetTexture('monster1.png');
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            0.0 / 12.0, // These constants are hardcoded with "monster1.png" in mind
            0.0 / 8.0,
            1.0 / 12.0,
            1.0 / 8.0
        ));
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    public constructor(
        private position: vec3,
        private visualScale: vec2,
        private collider: ICollider // TODO: ez nem biztos hogy kell még - level collision data
    ) {    }

    public get Position(): vec3 {
        return this.position;
    }
    
    IsCollidingWidth(boundingBox: BoundingBox): boolean {
        // TODO: make a collision helper class -- collision helper component
       const minX = this.position[0];
       const maxX = this.position[0] + this.visualScale[0]; // TODO: bounding box size
       const minY = this.position[1];
       const maxY = this.position[1] + this.visualScale[1];

       const bbMinX = boundingBox.position[0];
       const bbMaxX = boundingBox.position[0] + boundingBox.size[0];
       const bbMinY = boundingBox.position[1];
       const bbMaxY = boundingBox.position[1] + boundingBox.size[1];

       return bbMinX < maxX && bbMaxX > minX &&
           bbMinY < maxY && bbMaxY > minY;
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));
    }

    public Update(delta: number): void {
        this.Animate(delta);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 264) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 2) {
                this.currentAnimationFrame = 0;
            }

            this.sprite.textureOffset = vec2.fromValues(this.currentAnimationFrame / 12.0, 2 / 8.0);
            this.currentFrameTime = 0;
        }
    }
}