import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { SpriteBatch } from '../SpriteBatch';
import { Hero } from '../Hero';
import { IPickup } from './IPickup';
import { SoundEffectPool } from '../SoundEffectPool';

export class HealthPickup implements IPickup {
    private pickupSound = SoundEffectPool.GetInstance().GetAudio('audio/item1.wav', false);
    private visualScale = vec3.fromValues(2, 2, 1);
    private texture: Texture = TexturePool.GetInstance().GetTexture('potion.png');
    private sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);
    private startPosition: vec3;

    private constructor(
        private position: vec3,
        private onPickup: (sender: HealthPickup) => void,
        private shader: Shader
    ) {
        this.startPosition = vec3.clone(position);
    }

    public static async Create(position: vec3, onPickup: (sender: HealthPickup) => void): Promise<HealthPickup> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const health = new HealthPickup(position, onPickup, shader);
        return health;
    }

    get EndCondition(): boolean {
        return false;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(this.position, vec2.fromValues(this.visualScale[0], this.visualScale[1]));
    }

    public get Increase(): number {
        return 20;
    }

    public Draw(proj: mat4, view: mat4): void {
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            this.visualScale);
        this.batch.Draw(proj, view);
    }

    private currentTime = 0;

    public async Update(delta: number): Promise<void> {
        this.currentTime += delta;
        const frequency = 0.5; // 0.5 Hz
        const amplitude = 0.15;
        const yOffset = amplitude * Math.sin(2 * Math.PI * frequency * (this.currentTime / 1000));
        this.position[1] = this.startPosition[1] + yOffset;
    }

    public IsCollidingWidth(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    public Visit(hero: Hero): void {
        this.pickupSound.Play();
        hero.CollideWithHealth(this);
        this.onPickup(this); // Despawning is handled by the Game object, so we need no notify it that it can now despawn the object
    }
}
