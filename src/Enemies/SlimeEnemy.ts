import { ICollider } from '../ICollider';
import { vec2, vec3, vec4 } from 'gl-matrix';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { SoundEffectPool } from '../SoundEffectPool';
import { Waypoint } from '../Waypoint';
import { EnemyBase } from './IEnemy';
import { Hero } from '../Hero';
import { SoundEffect } from 'src/SoundEffect';
import { Animation } from '../Components/Animation';
import { PhysicsComponent } from '../Components/PhysicsComponent';

/**
 * Slime enemy is a passive enemy, meaning it does not actively attack the player, but it hurts when contacted directly
 */
export class SlimeEnemy extends EnemyBase {

    private targetWaypoint: Waypoint;
    // A little variation in movement speed;
    readonly minSpeed: number = 0.00004;
    readonly maxSpeed: number = 0.00006;
    private movementSpeed: number = Math.random() * (this.maxSpeed - this.minSpeed) + this.minSpeed;
    private physicsComponent: PhysicsComponent;

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
    private currentFrameSet = this.leftFacingAnimationFrames;

    private damagedTime = 0;
    private damaged = false;

    private constructor(
        position: vec3,
        shader: Shader,
        bbShader: Shader,
        visualScale: vec2,
        private collider: ICollider,
        private onDeath: (sender: SlimeEnemy) => void,
        private enemyDamageSound: SoundEffect,
        private enemyDeathSound: SoundEffect,
        texture: Texture
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

        // For now, slimes walk between their start position and another position with some constant offset
        const originalWaypoint = new Waypoint(vec3.clone(this.position), null);
        const targetPosition = vec3.add(vec3.create(), vec3.clone(this.position), vec3.fromValues(-6, 0, 0));
        this.targetWaypoint = new Waypoint(targetPosition, originalWaypoint);
        originalWaypoint.next = this.targetWaypoint;
        this.physicsComponent = new PhysicsComponent(this.position, vec3.create(), this.BoundingBox, this.bbOffset, this.collider, false);
    }

    public static async Create(position: vec3,
                               visualScale: vec2,
                               collider: ICollider,
                               onDeath: (sender: SlimeEnemy) => void): Promise<SlimeEnemy> {

        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const enemyDamageSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const enemyDeathSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
        const texture = await TexturePool.GetInstance().GetTexture('textures/monster1.png');

        return new SlimeEnemy(position, shader, bbShader, visualScale, collider, onDeath, enemyDamageSound, enemyDeathSound, texture);
    }

    public async Visit(hero: Hero): Promise<void> {
        await hero.CollideWithSlime(this);
    }

    public get EndCondition(): boolean {
        return false;
    }

    // TODO: damage amount
    // TODO: multiple types of enemies can be damaged, make this a component
    public async Damage(pushbackForce: vec3): Promise<void> {
        await this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        this.physicsComponent.AddToExternalForce(pushbackForce);

        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                await this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public async Update(delta: number): Promise<void> {
        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);

        if (!this.damaged) { // This way, the AI will not override velocity
            this.MoveTowardsNextWaypoint(delta);
        }

        this.animation.Animate(delta, this.currentFrameSet);
        this.physicsComponent.Update(delta);
    }

    // TODO: duplicated all over the place
    private RemoveDamageOverlayAfter(delta: number, showOverlayTime: number) {
        if (this.damaged) {
            this.damagedTime += delta;
        }

        if (this.damagedTime > showOverlayTime) {
            this.damagedTime = 0;
            this.damaged = false;
            this.shader.SetVec4Uniform('colorOverlay', vec4.create());
        }
    }

    private MoveTowardsNextWaypoint(delta: number): void {
        const dir = vec3.sub(vec3.create(), this.position, this.targetWaypoint.position);
        if (dir[0] < 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
            this.Move(vec3.fromValues(this.movementSpeed, 0, 0), delta);
        } else {
            this.currentFrameSet = this.leftFacingAnimationFrames;
            this.Move(vec3.fromValues(-this.movementSpeed, 0, 0), delta);
        }
        if (vec3.distance(this.position, this.targetWaypoint.position) < 0.025 && this.targetWaypoint.next) {
            this.targetWaypoint = this.targetWaypoint.next;
        }
    }

    public Move(direction: vec3, delta: number): void {
        this.physicsComponent.AddToExternalForce(vec3.scale(vec3.create(), direction, delta));
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }
}
