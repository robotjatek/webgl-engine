import { ICollider } from '../ICollider';
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Sprite } from '../Sprite';
import { Utils } from '../Utils';
import { SpriteBatch } from '../SpriteBatch';
import { Shader } from '../Shader';
import { Texture } from '../Texture';
import { TexturePool } from '../TexturePool';
import { BoundingBox } from '../BoundingBox';
import { SoundEffectPool } from '../SoundEffectPool';
import { Waypoint } from '../Waypoint';
import { IEnemy } from './IEnemy';
import { Hero } from '../Hero';
import { SoundEffect } from 'src/SoundEffect';
import { IProjectile } from 'src/Projectiles/IProjectile';

/**
 * Slime enemy is a passive enemy, meaning it does not actively attack the player, but it hurts when contacted directly
 */
export class SlimeEnemy implements IEnemy {

    private targetWaypoint: Waypoint;
    // A little variation in movement speed;
    readonly minSpeed: number = 0.002;
    readonly maxSpeed: number = 0.004;
    private movementSpeed: number = Math.random() * (this.maxSpeed - this.minSpeed) + this.minSpeed;

    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private leftFacingAnimationFrames: vec2[] = [
        vec2.fromValues(0 / 12, 3 / 8),
        vec2.fromValues(1 / 12, 3 / 8),
        vec2.fromValues(2 / 12, 3 / 8),
    ];
    private rightFacingAnimationFrames: vec2[] = [
        vec2.fromValues(0 / 12, 1 / 8),
        vec2.fromValues(1 / 12, 1 / 8),
        vec2.fromValues(2 / 12, 1 / 8),
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;

    private velocity: vec3 = vec3.fromValues(0, 0, 0);
    private lastPosition: vec3;
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(
            0.0 / 12.0, // These constants are hardcoded with "monster1.png" in mind
            0.0 / 8.0,
            1.0 / 12.0,
            1.0 / 8.0
        ));
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);
    private health = 3;
    private damagedTime = 0;
    private damaged = false;

    private bbOffset = vec3.fromValues(1.2, 1.8, 0);
    private bbSize = vec2.fromValues(0.8, 1.0);
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

    private constructor(
        private position: vec3,
        private shader: Shader,
        private bbShader: Shader,
        private visualScale: vec2,
        private collider: ICollider,
        private onDeath: (sender: SlimeEnemy) => void,
        private enemyDamageSound: SoundEffect,
        private enemyDeathSound: SoundEffect,
        private texture: Texture
    ) {
        this.lastPosition = vec3.create(); // If lastPosition is the same as position at initialization, the entity slowly falls through the floor

        // For now slimes walk between their start position and an other position with some constant offset
        const originalWaypoint = new Waypoint(this.position);
        const targetPosition = vec3.add(vec3.create(), this.position, vec3.fromValues(-6, 0, 0));
        this.targetWaypoint = new Waypoint(targetPosition);
        this.targetWaypoint.next = originalWaypoint;
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

    public Visit(hero: Hero): void {
        hero.CollideWithSlime(this);
    }

    public CollideWithAttack(attack: IProjectile): void {
        this.Damage(attack.PushbackForce);
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public get EndCondition(): boolean {
        return false;
    }

    public get Health(): number {
        return this.health;
    }

    // TODO: this is also duplicated in the code
    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return this.BoundingBox.IsCollidingWith(boundingBox);
    }

    // TODO: damage amount
    // TODO: multiple types of enemies can be damaged, make this a component
    public Damage(pushbackForce: vec3) {
        this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);

        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        this.batch.ModelMatrix = mat4.create();

        mat4.translate(this.batch.ModelMatrix, this.batch.ModelMatrix, this.position);
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
        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);

        this.MoveTowardsNextWaypoint(delta);
        this.Animate(delta);

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
            this.ChangeFrameSet(this.rightFacingAnimationFrames);
            this.MoveOnX(this.movementSpeed, delta);
        } else if (dir[0] > 0) {
            this.ChangeFrameSet(this.leftFacingAnimationFrames);
            this.MoveOnX(-this.movementSpeed, delta);
        }

        if (vec3.distance(this.position, this.targetWaypoint.position) < 0.25) {
            this.targetWaypoint = this.targetWaypoint.next;
        }
    }

    /**
     * Helper function to make frame changes seamless by immediatelly changing the spite offset when a frame change happens
     */
    private ChangeFrameSet(frames: vec2[]) {
        this.currentFrameSet = frames;
        this.sprite.textureOffset = this.currentFrameSet[this.currentAnimationFrame];
    }

    // TODO: simple move component implemented like in dragonenemy.ts. Implement it like a reusable component
    private MoveOnX(amount: number, delta: number): void {
        const nextPosition =
            vec3.fromValues(this.position[0] + amount * delta, this.position[1], this.position[2]);
        if (!this.checkCollision(nextPosition)) {
            this.position = nextPosition;
        }
    }

    private checkCollision(nextPosition: vec3): boolean {
        const nextBbPos = vec3.add(vec3.create(), nextPosition, this.bbOffset);
        const nextBoundingBox = new BoundingBox(nextBbPos, this.bbSize);
        return this.collider.IsCollidingWith(nextBoundingBox, true);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 264) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 2) {
                this.currentAnimationFrame = 0;
            }

            const currentFrame = this.currentFrameSet[this.currentAnimationFrame];
            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
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
        this.batch.Dispose();
        this.shader.Delete();
        this.bbBatch.Dispose();
        this.bbShader.Delete();
    }
}