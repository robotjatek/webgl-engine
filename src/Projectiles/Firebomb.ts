import { vec2, vec3 } from 'gl-matrix';
import { ProjectileBase } from './ProjectileBase';
import { Shader } from '../Shader';
import { SoundEffectPool } from '../SoundEffectPool';
import { TexturePool } from '../TexturePool';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { ICollider } from '../ICollider';
import { Texture } from '../Texture';
import { SoundEffect } from '../SoundEffect';
import { IProjectile } from './IProjectile';

export class Firebomb extends ProjectileBase {

    private moveDirection: vec3 = vec3.scale(vec3.create(), vec3.fromValues(0, 1, 0), 0.015);
    private spawnSoundPlayed = false;

    private constructor(
        shader: Shader,
        texture: Texture,
        centerPosition: vec3,
        bbShader: Shader,
        hitSound: SoundEffect,
        private spawnSound: SoundEffect,
        private despawnSound: SoundEffect,
        collider: ICollider) {

        const sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            Utils.DefaultSpriteTextureCoordinates);
        const visualScale = vec2.fromValues(0.85, 0.85);
        const bbOffset = vec3.fromValues(0, 0, 0);
        const bbSize = vec2.fromValues(1.0, 1.0);

        super(shader, texture, sprite, centerPosition, visualScale, bbOffset, bbSize, hitSound, false,
            collider, bbShader);
      //  bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.5));
    }

    public static async Create(centerPosition: vec3, collider: ICollider): Promise<Firebomb> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const hitSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_stomp.wav');
        const spawnSound = await SoundEffectPool.GetInstance().GetAudio('audio/fireball_spawn.mp3');
        const despawnSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const texture = await TexturePool.GetInstance().GetTexture('textures/firebomb.png');

        return new Firebomb(shader, texture, centerPosition, bbShader, hitSound, spawnSound, despawnSound, collider);
    }

    public get PushbackForce(): vec3 {
        return vec3.create();
    };

    public async Update(delta: number): Promise<void> {
        if (!this.spawnSoundPlayed) {
            await this.spawnSound.Play(1, 0.5);
            this.spawnSoundPlayed = true;
        }

        await this.Move(this.moveDirection, delta);
        if (this.AlreadyHit) {
            this.OnHitListeners.forEach(l => l.RemoveGameObject(this));
        }
    }

    public override Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

    public override async CollideWithAttack(attack: IProjectile): Promise<void> {
        if (!this.AlreadyHit) {
            await this.despawnSound.Play();
            await this.OnHit();
        }
    }
}