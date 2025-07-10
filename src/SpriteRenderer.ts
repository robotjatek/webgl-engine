import { IDisposable } from './IDisposable';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { Texture } from './Texture';
import { Sprite } from './Sprite';
import { mat4, vec2, vec3 } from 'gl-matrix';

export class SpriteRenderer implements IDisposable {

    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    public constructor(private shader: Shader,
                       private texture: Texture | null,
                       private sprite: Sprite,
                       private visualScale: vec2) {
    }

    public Draw(proj: mat4, view: mat4, position: vec3, rotation: number): void {
        this.UpdateModelMatrix(position, rotation);
        this.batch.Draw(proj, view);
    }

    public set TextureOffset(offset: vec2) {
        this.batch.TextureOffset = offset;
    }

    private UpdateModelMatrix(position: vec3, rotation: number): void {
        const modelMatrix = mat4.create();

        this.Rotate(modelMatrix, position, rotation);
        mat4.translate(modelMatrix, modelMatrix, position);
        mat4.scale(modelMatrix, modelMatrix, vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));
        this.batch.ModelMatrix = modelMatrix;
    }

    private Rotate(modelMat: mat4, position: vec3, rotation: number): void {
        // Rotation has to consider the center of the rotated object, and not its top-left position
        const centerX = position[0] + this.visualScale[0] * 0.5;
        const centerY = position[1] + this.visualScale[1] * 0.5;

        mat4.translate(modelMat, modelMat, vec3.fromValues(centerX, centerY, 0));
        mat4.rotateZ(modelMat, modelMat, rotation);
        mat4.translate(modelMat, modelMat, vec3.fromValues(-centerX, -centerY, 0));
    }

    public Dispose(): void {
        this.batch.Dispose();
    }
}