import { vec2, vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from '../../BoundingBox';
import { Shader } from '../../Shader';
import { Sprite } from '../../Sprite';
import { Texture } from '../../Texture';
import { TexturePool } from '../../TexturePool';
import { Utils } from '../../Utils';
import { Hero } from '../../Hero';
import { SoundEffectPool } from '../../SoundEffectPool';
import { IProjectile } from '../../Projectiles/IProjectile';
import { EnemyBase } from '../IEnemy';
import { SoundEffect } from 'src/SoundEffect';
import { IState } from '../IState';
import { SharedDragonStateVariables } from './States/SharedDragonStateVariables';
import { IdleState } from './States/IdleState';
import { RushState } from './States/RushStates/RushState';
import { FlyAttackState } from './States/FlyAttackStates/FlyAttackState';
import { EnterArenaState } from './States/EnterArenaState';
import { GroundAttackState } from './States/GroundAttackStates/GroundAttackState';
import { Layer } from '../../Layer';
import { Point } from '../../Point';
import { Animation } from '../../Components/Animation';

export class DragonEnemy extends EnemyBase {

    public async ChangeState(state: IState): Promise<void> {
        await this.state.Exit();
        this.state = state;
        await this.state.Enter();
    }

    public IDLE_STATE(): IState {
        return new IdleState(this.hero, this, this.collider, this.biteAttackSound, this.spawnProjectile, this.shared);
    }

    public RUSH_STATE(): IState {
        return new RushState(this.hero, this, this.rushSound, this.backingStartSound, this.biteAttackSound,
            this.spawnProjectile, this.shared);
    }

    public FLY_ATTACK_STATE(): IState {
        return new FlyAttackState(this.hero, this, this.rushSound, this.collider, this.spawnProjectile, this.shared);
    }

    public ENTER_ARENA_STATE(): IState {
        const enterWaypoint = this.enterWaypoint ?
            vec3.fromValues(this.enterWaypoint.x, this.enterWaypoint.y, 0) : null;
        return new EnterArenaState(this.hero, this, this.collider, enterWaypoint);
    }

    public GROUND_ATTACK_STATE(): IState {
        return new GroundAttackState(this.hero, this, this.collider, this.spawnProjectile, this.shared);
    }

    private state: IState = this.ENTER_ARENA_STATE();

    // Animation related
    private animation: Animation;
    private leftFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 3 / 8),
        vec2.fromValues(4 / 12, 3 / 8),
        vec2.fromValues(5 / 12, 3 / 8)
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 1 / 8),
        vec2.fromValues(4 / 12, 1 / 8),
        vec2.fromValues(5 / 12, 1 / 8)
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;


    // Behaviour related
    private shared: SharedDragonStateVariables = {
        timeSinceLastAttack: 0,
        timeSinceLastCharge: 9999,
        timeSinceLastFireBall: 0
    };

    private lastFacingDirection = vec3.fromValues(-1, 0, 0); // Facing right by default

    private damagedTime = 0;
    private damaged = false;
    private invincible = false;
    private timeInInvincibility = 0;

    private signaling = false;
    private attackSignalTime = 0;

    private constructor(
        position: vec3,
        health: number,
        shader: Shader,
        bbShader: Shader,
        visualScale: vec2, // TODO: this should not be a parameter but hardcoded
        private collider: Layer,
        private hero: Hero,
        private onDeath: (sender: DragonEnemy) => Promise<void>,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
        private enemyDamageSound: SoundEffect,
        private enemyDeathSound: SoundEffect,
        private biteAttackSound: SoundEffect,
        private rushSound: SoundEffect,
        private backingStartSound: SoundEffect,
        texture: Texture,
        private enterWaypoint: Point | null
    ) {
        const sprite: Sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(0.0 / 12.0, 0.0 / 8.0,
                1.0 / 12.0, 1.0 / 8.0)
        );
        const bbSize = vec2.fromValues(4.8, 3);
        const bbOffset = vec3.fromValues(0.1, 1.5, 0);
        super(shader, sprite, texture, bbShader, bbSize, bbOffset, position, visualScale, health);
        this.animation = new Animation(1 / 60 * 1000 * 15, this.renderer);
    }

    public static async Create(position: vec3,
                               health: number,
                               visualScale: vec2,
                               collider: Layer,
                               hero: Hero,
                               onDeath: (enemy: DragonEnemy) => Promise<void>,
                               spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
                               enterWaypoint: Point | null
    ): Promise<DragonEnemy> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');

        // TODO: ezeket a soundokat a state-ekben kéne létrehozni, nem innen lepasszolgatni
        const enemyDamageSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
        const enemyDeathSound = await SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
        const biteAttackSound = await SoundEffectPool.GetInstance().GetAudio('audio/bite2.wav');
        const rushSound = await SoundEffectPool.GetInstance().GetAudio('audio/dragon_roar.mp3');
        const backingStartSound = await SoundEffectPool.GetInstance().GetAudio('audio/charge_up.mp3');
        const texture = await TexturePool.GetInstance().GetTexture('textures/Monster2.png');

        return new DragonEnemy(position, health, shader, bbShader, visualScale, collider, hero, onDeath, spawnProjectile,
            enemyDamageSound, enemyDeathSound, biteAttackSound, rushSound, backingStartSound, texture, enterWaypoint);
    }

    public async Visit(hero: Hero): Promise<void> {
        await hero.CollideWithDragon(this);
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

    public get BiteProjectilePosition(): vec3 {
        // returns projectile center position
        return this.FacingDirection[0] > 0 ?
            vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(-2, 1, 0)) :
            vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(2, 1, 0));
    }

    public get FireBallProjectileSpawnPosition(): vec3 {
        // returns projectile center position
        return this.FacingDirection[0] > 0 ?
            vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(-3, 1, 0)) :
            vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(3, 1, 0));
    }

    public get EndCondition(): boolean {
        return true;
    }

    // TODO: az egész damage method duplikálva van a cactusban
    public override async Damage(pushbackForce: vec3): Promise<void> {
        // Dragon ignores pushback at the moment

        if (this.invincible) {
            return;
        }
        this.invincible = true;
        this.timeInInvincibility = 0;

        await this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        // TODO: dragon does not have velocity at the moment
        //vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);

        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                await this.enemyDeathSound.Play();
                await this.onDeath(this);
            }
        }

        // force state change on damage
        if (!(this.state instanceof EnterArenaState)) {
            await this.ChangeState(this.IDLE_STATE());
        }
    }

    public SignalAttack(): void {
        this.signaling = true;
        this.attackSignalTime = 0;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(0.65, 0.65, 0.65, 0));
    }

    public async Update(delta: number): Promise<void> {
        this.timeInInvincibility += delta;
        this.shared.timeSinceLastAttack += delta;
        this.shared.timeSinceLastCharge += delta;
        this.shared.timeSinceLastFireBall += delta;

        if (this.timeInInvincibility > 700 && this.invincible) {
            this.invincible = false;
            this.timeInInvincibility = 0;
        }

        // Face in the direction of the hero
        const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
        if (dir[0] < 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, -1, 0, 0);
        } else if (dir[0] > 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, 1, 0, 0);
        }
        this.animation.Animate(delta, this.currentFrameSet);
        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);

        await this.state.Update(delta);

        // TODO: gravity to velocity -- flying enemy maybe does not need gravity?
        // TODO: velocity to position
    }

    // TODO: duplicated all over the place
    private RemoveDamageOverlayAfter(delta: number, showOverlayTime: number) {
        if (this.damaged) {
            this.damagedTime += delta;
        }

        if (this.signaling) {
            this.attackSignalTime += delta;
        }

        if (this.damagedTime > showOverlayTime || this.attackSignalTime > 5 / 60 * 1000) {
            this.damagedTime = 0;
            this.damaged = false;
            this.attackSignalTime = 0;
            this.signaling = false;
            this.shader.SetVec4Uniform('colorOverlay', vec4.create());
        }
    }

    public Move(direction: vec3, delta: number): void {
        const nextPosition = vec3.scaleAndAdd(vec3.create(), this.position, direction, delta);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.position = nextPosition;
        }
    }

    /**
     * Calculate next position without considering collision
     */
    public CalculateNextPosition(direction: vec3, delta: number): vec3 {
        return vec3.scaleAndAdd(vec3.create(), this.position, direction, delta);
    }

    // TODO: ugyanez a slimeban is benn van privátként -- szintén valami movement component kéne
    public CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const nextBbPos = vec3.add(vec3.create(), nextPosition, this.bbOffset);
        const nextBoundingBox = new BoundingBox(nextBbPos, this.bbSize);
        return this.collider.IsCollidingWith(nextBoundingBox, true);
    }

    /**
     * Check if movement to the direction would cause a collision
     */
    public WillCollide(direction: vec3, delta: number): boolean {
        return this.CheckCollisionWithCollider(this.CalculateNextPosition(direction, delta))
    }

    public Dispose(): void {
        super.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }

}
