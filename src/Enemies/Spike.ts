import { Texture } from '../Texture';
import { vec2, vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { EnemyBase } from './IEnemy';
import { TexturePool } from 'src/TexturePool';
import { Sprite } from 'src/Sprite';
import { Utils } from 'src/Utils';
import { Shader } from 'src/Shader';
import { StompState } from '../Hero/States/DeadState';

/**
 * Stationary enemy. Cannot be damaged. Can damage the hero
 */
export class Spike extends EnemyBase {
    private constructor(position: vec3,
                        visualScale: vec2,
                        shader: Shader,
                        bbShader: Shader,
                        texture: Texture) {
        const sprite: Sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
        const bbSize: vec2 = vec2.fromValues(1, 1);
        const bbOffset: vec3 = vec3.fromValues(0, 0, 0);
        super(shader, sprite, texture, bbShader, bbSize, bbOffset, position, visualScale, 0)
    }

    public static async Create(position: vec3, visualScale: vec2): Promise<Spike> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const texture = await TexturePool.GetInstance().GetTexture('textures/spike.png');

        return new Spike(position, visualScale, shader, bbShader, texture);
    }

    public async Update(delta: number): Promise<void> {
        // No update for spike at the moment
    }

    public override async Damage(pushbackForce: vec3, damage: number): Promise<void> {
        // Cannot damage a spike
    }

    public override async DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void> {
        // Cannot damage a spike
    }

    public get EndCondition(): boolean {
        return false;
    }

    public async Visit(hero: Hero): Promise<void> {
        if (hero.StateClass !== StompState.name) {
            const pushbackForceRatio = vec3.fromValues(0, -0.008, 0);
            await hero.DamageWithInvincibilityConsidered(pushbackForceRatio, 20);
        } else {
            await hero.Damage(vec3.fromValues(0, -0.008, 0), 20);
            await hero.ChangeState(hero.AFTER_STOMP_STATE());
        }
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

}
