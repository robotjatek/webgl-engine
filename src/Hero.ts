import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { SoundEffectPool } from './SoundEffectPool';
import { IProjectile } from './Projectiles/IProjectile';
import { SoundEffect } from './SoundEffect';
import { KeyHandler } from './KeyHandler';
import { ControllerHandler } from './ControllerHandler';
import { IDisposable } from './IDisposable';
import { SpriteRenderer } from './SpriteRenderer';
import { Environment } from './Environment';
import { Animation } from './Components/Animation';
import { PhysicsComponent } from './Components/PhysicsComponent';
import { IState } from './IState';
import { DeadState } from './Hero/States/DeadState';
import { PlayerControlSource } from './Components/Input/PlayerControlSource';
import { IControlSource } from './Components/Input/IControlSource';
import { InputSource } from './Components/Input/InputSource';
import { ScriptControlSource } from './Components/Input/ScriptControlSource';
import { FlashOverlayComponent } from './Components/FlashOverlayComponent';
import { DamageComponent, IDamageable } from './Components/DamageComponent';
import { IdleState } from './Hero/States/IdleState';
import { DashState } from './Hero/States/DashState';
import { StompState } from './Hero/States/StompState';
import { AfterStompState } from './Hero/States/AfterStompState';
import { JumpState } from './Hero/States/JumpState';
import { WalkState } from './Hero/States/WalkState';
import { SharedHeroStateVariables } from './Hero/States/SharedHeroStateVariables';

export class Hero implements IDamageable, IDisposable {

    // TODO: make bb variables parametrizable
    private bbOffset = vec3.fromValues(1.2, 1.1, 0);
    private bbSize = vec2.fromValues(0.8, 1.8);
    private readonly invincibleFrames = 15;

    private sharedStateVariables: SharedHeroStateVariables = {
        timeSinceLastDash: 500,
        dashAvailable: true,
        dashUsed: false,
        timeSinceLastStomp: 500,
        bbOffset: this.bbOffset,
        bbSize: this.bbSize,
        rotation: 0,
        timeSinceLastMeleeAttack: 0,
        timeInOverHeal: 0
    }

    private input: IControlSource;

    public IDLE_STATE(): IState {
        return new IdleState(this, this.SpawnProjectile, this.physicsComponent,
            this.damageComponent, this.sharedStateVariables, this.animation);
    }

    public WALK_STATE(): IState {
        return new WalkState(this, this.SpawnProjectile, this.animation,
            this.physicsComponent, this.damageComponent, this.walkSound, this.sharedStateVariables);
    }

    public JUMP_STATE(): IState {
        return new JumpState(this, this.SpawnProjectile, this.jumpSound,
            this.landSound, this.physicsComponent, this.damageComponent, this.sharedStateVariables);
    }

    public DASH_STATE(): IState {
        return new DashState(this, this.SpawnProjectile, this.physicsComponent,
            this.damageComponent, this.stompSound, this.sharedStateVariables);
    }

    public STOMP_STATE(): IState {
        return new StompState(this, this.SpawnProjectile, this.physicsComponent,
            this.damageComponent, this.stompSound, this.sharedStateVariables, this.landSound);
    }

    public DEAD_STATE(): IState {
        return new DeadState(this, this.onDeath, this.dieSound, this.sharedStateVariables, this.animation);
    }

    public AFTER_STOMP_STATE(): IState {
        return new AfterStompState(this, this.SpawnProjectile, this.physicsComponent, this.damageComponent,
            this.sharedStateVariables);
    }

    private health: number = 100;
    private collectedCoins: number = 0;
    private internalState: IState;

    private readonly sprite: Sprite;
    private readonly renderer: SpriteRenderer;
    private readonly bbRenderer: SpriteRenderer;
    private readonly physicsComponent: PhysicsComponent;

    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);

    private lastPosition: vec3 = vec3.fromValues(0, 0, 1);

    private readonly animation: Animation;
    private leftFacingAnimationFrames = [
        vec2.fromValues(0.0 / 12.0, 3.0 / 8.0),
        vec2.fromValues(1.0 / 12.0, 3.0 / 8.0),
        vec2.fromValues(2.0 / 12.0, 3.0 / 8.0)
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(0.0 / 12.0, 1.0 / 8.0),
        vec2.fromValues(1.0 / 12.0, 1.0 / 8.0),
        vec2.fromValues(2.0 / 12.0, 1.0 / 8.0)
    ];
    private framesets = {
        "left_walk": this.leftFacingAnimationFrames,
        "right_walk": this.rightFacingAnimationFrames
    }

    public SetAnimationFrameset(name: "left_walk" | "right_walk"): void {
        this.currentFrameSet = this.framesets[name];
    }

    private currentFrameSet = this.rightFacingAnimationFrames;

    // http://www.davetech.co.uk/gamedevplatformer
    // TODO: buffer jump -- can jump if pressed jump right before landing
    // TODO: coyote time -- can jump for little time after falling
    // TODO: double jump
    // TODO: longer range but much slower attack

    public get BoundingBox(): BoundingBox {
        if (this.StateClass !== StompState.name) {
            const bbPosition = vec3.add(vec3.create(), this.position, this.bbOffset);
            return new BoundingBox(bbPosition, this.bbSize);
        } else {
            const bbPosition = vec3.add(vec3.create(), this.position, vec3.fromValues(0.75, 1.0, 0));
            return new BoundingBox(bbPosition, vec2.fromValues(1.5, 2));
        }
    }

    public get CollectedCoins(): number {
        return this.collectedCoins;
    }

    public IncrementCollectedCoins(): void {
        this.collectedCoins++;
    }

    public get Health(): number {
        return this.health;
    }

    public set Health(value: number) {
        this.health = value;
        if (this.health < 0) {
            this.health = 0;
        }
    }

    public get InputSource(): IControlSource {
        return this.input;
    }

    public TakeoverControl(): InputSource {
        const scriptInput = new InputSource();
        this.input = new ScriptControlSource(scriptInput);
        return scriptInput;
    }

    public ReleaseControl(): void {
        this.input = new PlayerControlSource(this.keyHandler, this.gamepadHandler);
    }

    public readonly DEFAULT_SPEED = 0.00025;
    private speed: number = this.DEFAULT_SPEED;
    public set Speed(value: number) {
        this.speed = value;
    }

    public get Speed(): number {
        return this.speed;
    }

    private lastFacingDirection: vec3 = vec3.fromValues(1, 0, 0);

    public get FacingDirection(): vec3 {
        return this.lastFacingDirection;
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

    public get IsWalking(): boolean {
        return vec3.distance(this.Position, this.lastPosition) > 0.0005;
    }

    public get StateClass(): string {
        return this.internalState.constructor.name;
    }

    private readonly damageComponent: DamageComponent;

    private constructor(
        private position: vec3,
        private visualScale: vec2,
        private collider: ICollider,
        private onDeath: () => void,
        private SpawnProjectile: (sender: Hero, projectile: IProjectile) => void,
        private shader: Shader,
        private bbShader: Shader,
        private jumpSound: SoundEffect,
        private landSound: SoundEffect,
        private walkSound: SoundEffect,
        private stompSound: SoundEffect,
        private damageSound: SoundEffect,
        private dieSound: SoundEffect,
        private texture: Texture,
        private keyHandler: KeyHandler,
        private gamepadHandler: ControllerHandler
    ) {
        this.sprite = new Sprite(
            Utils.DefaultSpriteVertices,
            // TODO: parametrize tex coords
            Utils.CreateTextureCoordinates( // texture-offset is added to these coordinates, so it must be (0,0)
                0.0 / 12.0, // These constants are hardcoded with "hero1.png" in mind
                0.0 / 8.0,
                1.0 / 12.0,
                1.0 / 8.0
            )
        );

        this.input = new PlayerControlSource(this.keyHandler, this.gamepadHandler);
        this.renderer = new SpriteRenderer(shader, texture, this.sprite, visualScale);
        this.renderer.TextureOffset = this.currentFrameSet[0];
        this.animation = new Animation(1 / 60 * 8 * 1000, this.renderer);
        const flashOverlayComponent = new FlashOverlayComponent(this.shader);

        this.bbRenderer = new SpriteRenderer(bbShader, null, this.bbSprite, this.bbSize);
        this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));

        this.physicsComponent = new PhysicsComponent(position, this.lastPosition, () => this.BoundingBox, this.bbOffset, collider, false, false);
        this.damageComponent = new DamageComponent(this, flashOverlayComponent, this.damageSound,
            this.physicsComponent, this.invincibleFrames);

        this.internalState = this.IDLE_STATE();
    }

    public static async Create(
        position: vec3, visualScale: vec2, collider: ICollider, onDeath: () => void,
        spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
        keyHandler: KeyHandler, gamepadHandler: ControllerHandler): Promise<Hero> {

        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Hero.frag');
        const bbShader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');

        const jumpSound = await SoundEffectPool.GetInstance().GetAudio('audio/jump.wav');
        const landSound = await SoundEffectPool.GetInstance().GetAudio('audio/land.wav', false);
        const walkSound = await SoundEffectPool.GetInstance().GetAudio('audio/walk1.wav', false);
        const stompSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_stomp.wav', true);
        const damageSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_damage.wav');
        const dieSound = await SoundEffectPool.GetInstance().GetAudio('audio/hero_die.wav', false);
        const texture = await TexturePool.GetInstance().GetTexture('textures/hero1.png');

        const hero = new Hero(position, visualScale, collider, onDeath, spawnProjectile,
            shader, bbShader, jumpSound, landSound, walkSound, stompSound, damageSound, dieSound, texture,
            keyHandler, gamepadHandler);
        await hero.Initialize();

        return hero;
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, this.sharedStateVariables.rotation);

        // TODO: a megváltozott bb méret nem látszik rajzolásnál mert nem updatelem a rendererben a vertexeket csak a positiont
        // Draw bounding box
        if (Environment.RenderBoundingBoxes) {
            this.bbRenderer.Draw(proj, view, this.BoundingBox.position, this.sharedStateVariables.rotation);
        }
    }

    private async Initialize(): Promise<void> {
        await this.internalState.Enter();
    }

    public async Update(delta: number): Promise<void> {
        await this.internalState.Update(delta);
        this.animation.Animate(delta, this.currentFrameSet);
        await this.physicsComponent.Update(delta);
    }

    public FaceLeft(): void {
        vec3.set(this.lastFacingDirection, -1, 0, 0);
    }

    public FaceRight(): void {
        vec3.set(this.lastFacingDirection, 1, 0, 0);
    }

    public async DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void> {
        await this.damageComponent.DamageWithInvincibilityConsidered(pushbackForce, damage);
    }

    public async Damage(pushbackForce: vec3, damage: number): Promise<void> {
        await this.damageComponent.Damage(pushbackForce, damage);
    }

    public Kill(): void {
        if (this.StateClass !== DeadState.name) {
            this.Health = 0;
        }
    }

    public async ChangeState(state: IState): Promise<void> {
        await this.internalState.Exit();
        this.internalState = state;
        await this.internalState.Enter();
    }

    public Dispose(): void {
        this.renderer.Dispose();
        this.bbRenderer.Dispose();
        this.shader.Delete();
        this.bbShader.Delete();
    }
}
