import { mat4, vec2, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { Hero } from '../Hero';
import { IPickup } from './IPickup';
import { SoundEffectPool } from '../SoundEffectPool';
import { SoundEffect } from 'src/SoundEffect';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SpriteRenderer } from '../SpriteRenderer';

export class HealthPickup implements IPickup {
    private visualScale = vec2.fromValues(2, 2);
    private sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private readonly renderer: SpriteRenderer;
    private readonly startPosition: vec3;

    private constructor(
        private position: vec3,
        private onPickup: (sender: HealthPickup) => void,
        private shader: Shader,
        private pickupSound: SoundEffect,
        private texture: Texture
    ) {
        this.startPosition = vec3.clone(position);
        this.renderer = new SpriteRenderer(shader, texture, this.sprite, this.visualScale);
    }

    public static async Create(position: vec3, onPickup: (sender: HealthPickup) => void): Promise<HealthPickup> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const pickupSound = await SoundEffectPool.GetInstance().GetAudio('audio/item1.wav', false);
        const texture = await TexturePool.GetInstance().GetTexture('textures/potion.png');

        return new HealthPickup(position, onPickup, shader, pickupSound, texture);
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
        this.renderer.Draw(proj, view, this.position, 0);
    }

    private currentTime = 0;

    public async Update(delta: number): Promise<void> {
        this.currentTime += delta;
        const frequency = 0.5; // 0.5 Hz
        const amplitude = 0.15;
        const yOffset = amplitude * Math.sin(2 * Math.PI * frequency * (this.currentTime / 1000));
        this.position[1] = this.startPosition[1] + yOffset;
    }

    public IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
        // No-op
    }

    public async Visit(hero: Hero): Promise<void> {
        await this.pickupSound.Play();
        hero.CollideWithHealth(this);
        // De-spawning is handled by the Game object, so we need no notify it that it can now despawn the object
        this.onPickup(this);
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.shader.Delete();
    }
}
