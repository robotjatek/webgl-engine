import { Texture } from '../Texture';
import { mat4, vec2, vec3} from 'gl-matrix';
import { Hero } from 'src/Hero';
import { IEnemy } from './IEnemy';
import { TexturePool } from 'src/TexturePool';
import { Sprite } from 'src/Sprite';
import { Utils } from 'src/Utils';
import { SpriteBatch } from 'src/SpriteBatch';
import { Shader } from 'src/Shader';
import { BoundingBox } from 'src/BoundingBox';
import { IProjectile } from 'src/Projectiles/IProjectile';

/**
 * Stationary enemy. Cannot be damaged. Can damage the hero
 * // TODO: maybe not enemy, but game object like Coin
 */
export class Spike implements IEnemy {
    private sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    private bbSize: vec2 = vec2.fromValues(1, 1);
    private bbOffset: vec3 = vec3.fromValues(0, 0, 0);

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

    private constructor(private position: vec3, private visualScale: vec2, private shader: Shader, private bbShader: Shader, private texture: Texture) {
      //  this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.3));
    }

    public CollideWithAttack(attack: IProjectile): void {
        this.Damage(attack.PushbackForce); // No op at the moment. See: Damage()
    }

    public static async Create(position: vec3, visualScale: vec2): Promise<Spike> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const texture = await TexturePool.GetInstance().GetTexture('textures/spike.png');

        return new Spike(position, visualScale, shader, bbShader, texture);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.bbSize[0], this.bbSize[1], 1));
    }

    public async Update(delta: number): Promise<void> {
        // No update for spike at the moment
    }

    public Damage(pushbackForce: vec3): void {
        // Cannot damage a spike
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize)
    }

    public get EndCondition(): boolean {
        return false;
    }

    public get Health(): number {
        return 0;
    }

    public Visit(hero: Hero): void {
        hero.CollideWithSpike(this);
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.shader.Delete();
        this.bbBatch.Dispose();
        this.bbShader.Delete();
    }

}