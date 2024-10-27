import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from '../../BoundingBox';
import { ICollider } from '../../ICollider';
import { Shader } from '../../Shader';
import { Sprite } from '../../Sprite';
import { SpriteBatch } from '../../SpriteBatch';
import { Texture } from '../../Texture';
import { TexturePool } from '../../TexturePool';
import { Utils } from '../../Utils';
import { Hero } from '../../Hero';
import { SoundEffectPool } from '../../SoundEffectPool';
import { IProjectile } from '../../Projectiles/IProjectile';
import { IEnemy } from '../IEnemy';
import { SoundEffect } from 'src/SoundEffect';
import { IState } from './States/IState';
import { SharedDragonStateVariables } from './States/SharedDragonStateVariables';
import { IdleState } from './States/IdleState';
import { RushState as RushState } from './States/RushState';

// TODO: boss fly-by state
// TODO. attack from the air
export class DragonEnemy implements IEnemy {

    public ChangeState(state: IState) {
        this.state = state;
    }

    public IDLE_STATE(): IState {
        return new IdleState(this.hero, this, this.collider, this.biteAttackSound, this.spawnProjectile);
    }

    public RUSH_STATE(): IState {
        return new RushState(this.hero, this, this.rushSound, this.backingStartSound, this.biteAttackSound, this.spawnProjectile);
    }

    private state: IState = this.IDLE_STATE();

    // Animation related
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private leftFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 3 / 8),
        vec2.fromValues(4 / 12, 3 / 8),
        vec2.fromValues(5 / 12, 3 / 8),
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 1 / 8),
        vec2.fromValues(4 / 12, 1 / 8),
        vec2.fromValues(5 / 12, 1 / 8),
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;

    // Rendering related
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(0.0 / 12.0, 0.0 / 8.0,
            1.0 / 12.0, 1.0 / 8.0)
    );
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    // Behaviour related
    private shared: SharedDragonStateVariables = {
        timeSinceLastAttack: 0,
        timeSinceLastCharge: 9999

    };

    private lastFacingDirection = vec3.fromValues(-1, 0, 0); // Facing right by default

    private health = 3;
    private damagedTime = 0;
    private damaged = false;

    private bbSize = vec2.fromValues(4.8, 3);
    private bbOffset = vec3.fromValues(0.1, 1.5, 0);

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], null);

    private constructor(
        private position: vec3,
        private shader: Shader,
        private bbShader: Shader,
        private visualScale: vec2, // TODO: this should not be a parameter but hardcoded
        private collider: ICollider,
        private hero: Hero,
        private onDeath: (sender: DragonEnemy) => void,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
        private enemyDamageSound: SoundEffect,
        private enemyDeathSound: SoundEffect,
        private biteAttackSound: SoundEffect,
        private rushSound: SoundEffect,
        private backingStartSound: SoundEffect,
        private texture: Texture
    ) {
        this.sprite.textureOffset = this.leftFacingAnimationFrames[0];
        // this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public static async Create(position: vec3,
        visualScale: vec2,
        collider: ICollider,
        hero: Hero,
        onDeath: (enemy: DragonEnemy) => void,
        spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void
    ): Promise<DragonEnemy> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        const enemyDamageSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const enemyDeathSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
        const biteAttackSound = await SoundEffectPool.GetInstance().GetAudio('audio/bite2.wav');
        const rushSound = await SoundEffectPool.GetInstance().GetAudio('audio/dragon_roar.mp3');
        const backingStartSound = await SoundEffectPool.GetInstance().GetAudio('audio/charge_up.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/Monster2.png');

        return new DragonEnemy(position, shader, bbShader, visualScale, collider, hero, onDeath, spawnProjectile,
            enemyDamageSound, enemyDeathSound, biteAttackSound, rushSound, backingStartSound, texture);
    }

    public get Health(): number {
        return this.health;
    }

    public Visit(hero: Hero): void {
        hero.CollideWithDragon(this); // This call is not needad at all as hero does nothing with this interaction
    }

    public CollideWithAttack(attack: IProjectile): void {
        this.Damage(attack.PushbackForce);
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get CenterPosition(): vec3 {
        return vec3.fromValues(
            this.position[0] + this.visualScale[0] / 2,
            this.position[1] + this.visualScale[1] / 2,
            0);
    }

    public get FacingDirection(): vec3 {
        return this.lastFacingDirection;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public get EndCondition(): boolean {
        return true;
    }

    public IsCollidingWith(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Damage(pushbackForce: vec3): void {
        // Dragon ignores pushback at the moment

        this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        // TODO: dragon does not have velocity at the moment
        //vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);

        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }

        // Cancel rush on damage
        if (this.state instanceof RushState) {
            this.ChangeState(this.IDLE_STATE());
        }
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        // Bounding box drawing
        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.bbSize[0], this.bbSize[1], 1));
    }

    public async Update(delta: number): Promise<void> {
        this.shared.timeSinceLastAttack += delta;
        this.shared.timeSinceLastCharge += delta;

        // Face in the direction of the hero
        const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
        if (dir[0] < 0) {
            this.ChangeFrameSet(this.rightFacingAnimationFrames);
            vec3.set(this.lastFacingDirection, -1, 0, 0);
        } else if (dir[0] > 0) {
            this.ChangeFrameSet(this.leftFacingAnimationFrames);
            vec3.set(this.lastFacingDirection, 1, 0, 0);
        }
        this.Animate(delta);
        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);

        this.state.Update(delta, this.shared);

        // In every state
        // Move towards the hero on the X axis no matter the current state
        const distance = vec3.distance(this.CenterPosition, this.hero.CenterPosition);
        if (distance > 3) {
            if (dir[0] > 0) {
                this.MoveOnX(-0.003, delta)
            } else if (dir[0] > 0) {
                this.MoveOnX(0.003, delta);
            }
        }

        // TODO: gravity to velocity -- flying enemy maybe does not need gravity?
        // TODO: velocity to position
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

    public MoveOnX(amount: number, delta: number): void {
        // TODO: this fails with fast movement speed
        const nextPosition =
            vec3.fromValues(this.position[0] + amount * delta, this.position[1], this.position[2]);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.position = nextPosition;
        }
    }

    public MoveOnY(amount: number, delta: number): void {
        const nextPosition = vec3.fromValues(this.position[0], this.position[1] + amount * delta, 0);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.position = nextPosition;
        }
    }

    private CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const nextBbPos = vec3.add(vec3.create(), nextPosition, this.bbOffset);
        const nextBoundingBox = new BoundingBox(nextBbPos, this.bbSize);
        const colliding = this.collider.IsCollidingWith(nextBoundingBox, true);

        return colliding;
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

    /**
     * Helper function to make frame changes seamless by immediatelly changing the spite offset when a frame change happens
     */
    private ChangeFrameSet(frames: vec2[]) {
        this.currentFrameSet = frames;
        this.sprite.textureOffset = this.currentFrameSet[this.currentAnimationFrame];
    }

    public Dispose(): void {
        this.batch.Dispose();
        this.bbBatch.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

}