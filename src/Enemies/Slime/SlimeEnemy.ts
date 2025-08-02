import { ICollider } from '../../ICollider';
import { vec2, vec3 } from 'gl-matrix';
import { Sprite } from '../../Sprite';
import { Utils } from '../../Utils';
import { Shader } from '../../Shader';
import { Texture } from '../../Texture';
import { TexturePool } from '../../TexturePool';
import { SoundEffectPool } from '../../SoundEffectPool';
import { EnemyBase } from '../IEnemy';
import { Hero } from '../../Hero/Hero';
import { SoundEffect } from 'src/SoundEffect';
import { Animation } from '../../Components/Animation';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { FlashOverlayComponent } from '../../Components/FlashOverlayComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { StompState } from '../../Hero/States/StompState';
import { ISlimeAI } from './AI/ISlimeAI';
import { WaypointAI } from './AI/WaypointAI';
import { FollowHeroAI } from './AI/FollowHeroAI';

export enum SlimeAIMode {
    PASSIVE,
    AGGRESSIVE
}

export class SlimeEnemy extends EnemyBase {
    public static readonly AIMode = SlimeAIMode;
    private readonly physicsComponent: PhysicsComponent;
    private readonly damageComponent: DamageComponent;

    private animation: Animation;
    private leftFacingAnimationFrames: vec2[] = [
        vec2.fromValues(0 / 12, 3 / 8),
        vec2.fromValues(1 / 12, 3 / 8),
        vec2.fromValues(2 / 12, 3 / 8)
    ];
    private rightFacingAnimationFrames: vec2[] = [
        vec2.fromValues(0 / 12, 1 / 8),
        vec2.fromValues(1 / 12, 1 / 8),
        vec2.fromValues(2 / 12, 1 / 8)
    ];

    private framesets = {
        "left_walk": this.leftFacingAnimationFrames,
        "right_walk": this.rightFacingAnimationFrames
    }

    private currentFrameSet = this.leftFacingAnimationFrames;

    private ai: ISlimeAI;

    private constructor(
        position: vec3,
        shader: Shader,
        bbShader: Shader,
        visualScale: vec2,
        private collider: ICollider,
        private onDeath: (sender: SlimeEnemy) => void,
        private enemyDamageSound: SoundEffect,
        private enemyDeathSound: SoundEffect,
        texture: Texture,
        hero: Hero,
        aiMode: SlimeAIMode
    ) {
        const sprite: Sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(
                0.0 / 12.0, // These constants are hardcoded with "monster1.png" in mind
                0.0 / 8.0,
                1.0 / 12.0,
                1.0 / 8.0
            ));
        const bbSize = vec2.fromValues(0.8, 1.0);
        const bbOffset = vec3.fromValues(1.2, 1.8, 0);
        const health = 3;
        super(shader, sprite, texture, bbShader, bbSize, bbOffset, position, visualScale, health);
        this.animation = new Animation(1 / 60 * 1000 * 15, this.renderer);

        this.physicsComponent = new PhysicsComponent(this.position, vec3.create(), () => this.BoundingBox, this.bbOffset, this.collider, false);
        const damageFlashComponent = new FlashOverlayComponent(this.shader);
        this.damageComponent = new DamageComponent(this, damageFlashComponent, this.enemyDamageSound, this.physicsComponent, 0);
        if (aiMode === SlimeAIMode.PASSIVE) {
            this.ai = new WaypointAI(this, this.physicsComponent);
        } else {
            this.ai = new FollowHeroAI(this, this.physicsComponent, hero);
        }
    }

    public static async Create(position: vec3,
                               visualScale: vec2,
                               collider: ICollider,
                               hero: Hero,
                               aiMode: SlimeAIMode,
                               onDeath: (sender: SlimeEnemy) => void): Promise<SlimeEnemy> {

        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const enemyDamageSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const enemyDeathSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
        const texture = await TexturePool.GetInstance().GetTexture('textures/monster1.png');

        return new SlimeEnemy(position, shader, bbShader, visualScale, collider, onDeath,
            enemyDamageSound, enemyDeathSound, texture, hero, aiMode);
    }

    public async Visit(hero: Hero): Promise<void> {
        if (hero.StateClass !== StompState.name) {
            const pushbackForceRatio = vec3.fromValues(hero.FacingDirection[0] * -0.0075, -0.003, 0);
            await hero.DamageWithInvincibilityConsidered(pushbackForceRatio, 34);
        } else if (hero.StateClass === StompState.name) {
            await hero.ChangeState(hero.AFTER_STOMP_STATE());
            await this.Damage(vec3.create(), 1); // Damage the enemy without pushing it to any direction
        }
    }

    public get EndCondition(): boolean {
        return false;
    }

    public override async Damage(pushbackForce: vec3, damage: number): Promise<void> {
       await this.damageComponent.Damage(pushbackForce, damage);
        if (this.health <= 0) {
            if (this.onDeath) {
                await this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public override async DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void> {
        throw new Error('Method not implemented.');
    }

    public async Update(delta: number): Promise<void> {
        this.damageComponent.Update(delta);
        await this.ai.Update(delta);
        this.animation.Animate(delta, this.currentFrameSet);
        this.physicsComponent.Update(delta);
    }

    public Move(direction: vec3, delta: number): void {
        this.physicsComponent.AddToExternalForce(vec3.scale(vec3.create(), direction, delta));
    }

    public SetAnimationFrameset(name: "left_walk" | "right_walk"): void {
        this.currentFrameSet = this.framesets[name];
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }
}
