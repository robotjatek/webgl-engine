import { ICollider } from '../ICollider';
import { vec2, vec3, vec4 } from 'gl-matrix';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { BoundingBox } from '../BoundingBox';
import { SoundEffectPool } from '../SoundEffectPool';
import { Waypoint } from '../Waypoint';
import { EnemyBase } from './IEnemy';
import { Hero } from '../Hero';
import { SoundEffect } from 'src/SoundEffect';
import { Animation } from '../Animation';

/**
 * Slime enemy is a passive enemy, meaning it does not actively attack the player, but it hurts when contacted directly
 */
export class SlimeEnemy extends EnemyBase {

    private targetWaypoint: Waypoint;
    // A little variation in movement speed;
    readonly minSpeed: number = 0.002;
    readonly maxSpeed: number = 0.004;
    private movementSpeed: number = Math.random() * (this.maxSpeed - this.minSpeed) + this.minSpeed;

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

    private velocity: vec3 = vec3.fromValues(0, 0, 0);
    private readonly lastPosition: vec3;

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
        this.lastPosition = vec3.create(); // If lastPosition is the same as position at initialization, the entity slowly falls through the floor
        this.animation = new Animation(1 / 60 * 1000 * 15, this.renderer);

        // For now, slimes walk between their start position and another position with some constant offset
        const originalWaypoint = new Waypoint(this.position, null);
        const targetPosition = vec3.add(vec3.create(), this.position, vec3.fromValues(-6, 0, 0));
        this.targetWaypoint = new Waypoint(targetPosition, originalWaypoint);
        originalWaypoint.next = this.targetWaypoint;
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
        vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);

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

        this.MoveTowardsNextWaypoint(delta);
        this.animation.Animate(delta, this.currentFrameSet);

        vec3.copy(this.lastPosition, this.position);
        this.ApplyGravityToVelocity(delta);
        this.ApplyVelocityToPosition(delta);
        this.HandleCollisionWithCollider();
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
        } else if (dir[0] > 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
            this.Move(vec3.fromValues(-this.movementSpeed, 0, 0), delta);
        }

        if (vec3.distance(this.position, this.targetWaypoint.position) < 0.25 && this.targetWaypoint.next) {
            this.targetWaypoint = this.targetWaypoint.next;
        }
    }

    // TODO: simple move component implemented like in dragonenemy.ts. Implement it like a reusable component
    public Move(direction: vec3, delta: number): void {
        const nextPosition = vec3.scaleAndAdd(vec3.create(), this.position, direction, delta);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.position = nextPosition;
        }
    }

    public CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const nextBbPos = vec3.add(vec3.create(), nextPosition, this.bbOffset);
        const nextBoundingBox = new BoundingBox(nextBbPos, this.bbSize);
        return this.collider.IsCollidingWith(nextBoundingBox, true);
    }

    // TODO: should make this a component system
    private ApplyGravityToVelocity(delta: number): void {
        const gravity = vec3.fromValues(0, 0.00004, 0);
        vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), gravity, delta));
    }

    // TODO: make this a component system
    private ApplyVelocityToPosition(delta: number) {
        // TODO: check if next position causes a collision. Do not apply velocity if collision happens
        const moveValue = vec3.create();
        vec3.scale(moveValue, this.velocity, delta);
        vec3.add(this.position, this.position, moveValue);
    }


    // TODO: how to make this a component?
    private HandleCollisionWithCollider() {
        const colliding = this.collider.IsCollidingWith(this.BoundingBox, false);
        if (colliding) {
            vec3.copy(this.position, this.lastPosition);
            this.velocity = vec3.create();
        }
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }
}